'use strict';

// Capture the virtualized ChatGPT conversation before cloning: scroll-harvest of
// off-screen turns, cancel flag, loading overlay. `harvestCancelled` is shared
// (also read by convert() and block-mode in common.js).

function findVirtualizedScroller() {
    // Pair layout: the thread scroller names itself. The sidebar has a
    // scroller of its own, so the name, not "some scrollable ancestor", is
    // what tells them apart (CHATGPT-DOM.md §9).
    const named = document.querySelector('[data-app-action-timeline-scroll]');
    if(named && named.querySelector('div[data-turn-key]') &&
       named.scrollHeight > named.clientHeight + 100) {
        return named;
    }
    const turns = document.querySelectorAll(GPTPDF_TURN);
    if(!turns.length) {
        return null;
    }
    let el = turns[0].parentElement;
    while(el && el !== document.body) {
        const s = window.getComputedStyle(el);
        if((s.overflowY === 'auto' || s.overflowY === 'scroll') &&
           el.scrollHeight > el.clientHeight + 100) {
            return el;
        }
        el = el.parentElement;
    }
    return null;
}

// Scroll position as DISTANCE FROM THE TOP of the loaded thread, whichever way
// the scroller runs. The pair layout's thread is flex column-reverse: its
// scroll origin is the bottom, so scrollTop is 0 at the newest message and
// negative upward (standard since Chrome 85). Read raw, "0" says "at the top"
// while standing at the very bottom — the climb would see nothing to climb and
// the export would ship the newest 3–6 turns as the whole chat; another
// exporter shipped exactly that the same week (CHATGPT-DOM.md §9).
// On a classic scroller the axis IS scrollTop, value for value, so every
// decision the harvest makes there is unchanged.
function gptpdfScrollAxis(s) {
    let reversed = window.getComputedStyle(s).flexDirection === 'column-reverse';
    if(!reversed && s.scrollTop === 0 && s.scrollHeight > s.clientHeight) {
        // At rest a bottom-origin scroller also reads 0 (the chat opens at the
        // bottom), so ask it directly: only such a scroller accepts a negative
        // position. A classic one clamps -1 to 0 — no movement, no event.
        s.scrollTop = -1;
        reversed = s.scrollTop < 0;
        s.scrollTop = 0;
    }
    const range = function() {
        return Math.max(0, s.scrollHeight - s.clientHeight);
    };
    return {
        get: function() {
            if(s.scrollTop < 0) {
                reversed = true;    // only a bottom-origin scroller goes below 0
            }
            return reversed ? s.scrollTop + range() : s.scrollTop;
        },
        set: function(d) {
            s.scrollTop = reversed ? d - range() : d;
        },
        reversed: function() { return reversed; }
    };
}

// Turn number out of data-testid="conversation-turn-N". The number runs across
// the whole conversation (verified 2026-07-20: the tail of a long chat gave
// 83…94), which is what lets us rebuild order by sorting instead of trusting
// the DOM — under the new virtualizer the DOM holds only a ragged window.
function turnIndex(id) {
    const m = /(\d+)\s*$/.exec(id || '');
    return m ? parseInt(m[1], 10) : -1;
}

// Holes in the captured numbering = turns the scroll pass flew past. They are
// unmounted, so they leave no node to scroll back to; only another pass finds
// them. (Edited/branched chats can have genuine holes — hence bounded passes.)
function missingTurnIndices(cache) {
    const nums = Array.from(cache.keys()).map(turnIndex)
        .filter(n => n >= 0).sort((a, b) => a - b);
    const gaps = [];
    for(let i = 1; i < nums.length; i++) {
        for(let n = nums[i - 1] + 1; n < nums[i]; n++) {
            gaps.push(n);
        }
    }
    return gaps;
}

// The smallest turn number we hold. Turns BELOW it are a different kind of
// loss than a gap: they are not holes in the numbering, they are simply
// absent, and missingTurnIndices() is blind to them — a chat whose beginning
// never loaded into the tab reads as "nothing missing".
function minTurnIndex(cache) {
    let min = Infinity;
    cache.forEach(function(_v, id) {
        const n = turnIndex(id);
        if(n >= 0 && n < min) {
            min = n;
        }
    });
    return min;
}

// Сколько стоять у верха, когда там тихо.
//
// Первая версия была лестницей 6 → 14 → 25 с под гипотезу «сервер придерживает
// старое». Гипотеза не подтвердилась: 212 секунд стояния у верха с перехватом
// сетевых вызовов дали НОЛЬ запросов. Лестница же стоила 45 секунд на каждом
// длинном чате — автор увидел их живьём 08-27 как «бился о потолок».
//
// Теперь порог измеряется, а не назначается: смотрим, какая самая длинная
// тишина в ЭТОМ прогоне всё-таки кончилась приходом новых сообщений, и даём
// втрое больше. Страница, отвечающая за 200 мс, задержит нас на секунду;
// страница, которой правда нужно четыре секунды, получит двенадцать.
// Границы подобраны по полевому провалу 08-27: с 1.2 с / 1.5 с длинные чаты
// снова перестали доходить до начала. Полнота дороже секунд — короткий чат
// платит за неё несколько секунд, неполный длинный не стоит ничего.
const CLIMB_FIRST_WAIT_MS = 3000;   // пока сверху не приходило ничего
const CLIMB_NUDGE_MS = 400;
const CLIMB_MIN_PATIENCE_MS = 6000;
const CLIMB_MAX_PATIENCE_MS = 25000;

function setHarvestProgress(text) {
    const t = document.querySelector(
        '#gptpdf-loading-overlay .gptpdf-loading-text');
    if(t) {
        t.textContent = text;
    }
}

// Граница прохода — прогресс, а не часы: идём, пока позиция двигается или
// прибывают сообщения; стоп, когда ничего не двигалось. Абсолютный потолок
// существует только чтобы сломанная страница не крутилась вечно — Cancel
// доступен всю дорогу.
const HARVEST_IDLE_MS = 60000;
const HARVEST_CAP_MS = 15 * 60 * 1000;

function makeHarvestBudget() {
    const started = Date.now();
    let last = started;
    return {
        progress: function() { last = Date.now(); },
        elapsed: function() { return Date.now() - started; },
        expired: function() {
            const now = Date.now();
            return now - last > HARVEST_IDLE_MS ||
                   now - started > HARVEST_CAP_MS;
        }
    };
}

// A turn's identity. `data-testid="conversation-turn-N"` is NOT it. Measured
// live 2026-08-26 on an old chat, across three exports of the same tab:
// `1→40`, then `1→70`, then `1→190`. The bottom turn is always the newest
// message, so a number that grows for the SAME message can only be counting
// the LOADED window — every turn is renumbered when an older page arrives, and
// the same testid names different messages minutes apart. Keying a cache on it
// silently merges two messages into one. `data-message-id` is the server's own
// id for the message and holds still (confirmed present in the same measure).
//
// Pair layout: the turn names itself — `data-turn-key` is the question's
// message id and holds across remounts (CHATGPT-DOM.md §9). An empty key is
// replaced by a hash of the turn's text, so two such turns never merge.
function turnKey(t) {
    if(gptpdfIsPairTurn(t)) {
        const key = t.getAttribute('data-turn-key');
        return key ? 'turn:' + key : 'turn#' + textHash(t.textContent);
    }
    const m = t.querySelector('[data-message-id]');
    const id = m && m.getAttribute('data-message-id');
    return id ? 'msg:' + id : (t.getAttribute('data-testid') || '');
}

function textHash(s) {
    let h = 5381;
    const text = String(s || '').slice(0, 2000);
    for(let i = 0; i < text.length; i++) {
        h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(36);
}

// Where a turn stands in this snapshot. A classic turn says it in data-testid
// (window-relative and shifting — recordTurnPositions absorbs the shift). A
// pair turn states no number the DOM keeps: `fallback-turn-N` beside it is
// renumbered per mounted window. But the mounted window is contiguous and in
// conversation order, so the index inside it is exactly such a shifting
// number, and the same anchoring places it.
function turnNumber(t, indexInSnapshot) {
    return gptpdfIsPairTurn(t) ? indexInSnapshot
        : turnIndex(t.getAttribute('data-testid'));
}

// How many turns the page holds right now, read as the highest turn number in
// the DOM. Numbering is window-relative, so this is the size of the LOADED
// conversation at this moment — the only total the page ever states out loud.
// The pair layout states no total at all → null ("unknown", not zero).
function loadedTurnCount() {
    const turns = document.querySelectorAll(
        '[data-testid^="conversation-turn"]');
    if(!turns.length && gptpdfIsPairLayout()) {
        return null;
    }
    let max = 0;
    for(let i = 0; i < turns.length; i++) {
        const n = turnIndex(turns[i].getAttribute('data-testid'));
        if(n > max) {
            max = n;
        }
    }
    return max;
}

// Order without trusting the numbers. Each snapshot hands us a few turns in DOM
// order, and consecutive snapshots overlap (we never move a full viewport at a
// time), so an unknown turn can always be spliced in against a neighbour we
// already hold. Renumbering does not disturb this: relative order is what the
// DOM states, and that never lies.
// Position, not sequence. Every snapshot states two things the DOM cannot lie
// about: which turns are on screen, and their numbers relative to each other.
// The numbers themselves shift — a prepended page renumbers the whole chat —
// but they shift by the SAME amount for everyone, and that amount is readable
// from any turn we already hold. So each snapshot is anchored against what we
// know, and every turn lands in one coordinate system that survives both
// renumbering and jumps.
//
// The sequence-splicing this replaced needed snapshots to arrive in a
// continuous sweep. They do not: ChatGPT yanks the list when its top is
// touched, and a jump left the new turns to be appended at the end — which
// silently ROTATED whole exports. Measured 2026-08-27 on three 81-page PDFs of
// one chat: same text (266 651 vs 266 675 chars), yet a passage at 10% of one
// file sat at 91% of another, and two of three opened on 25 Jan instead of
// 18 Jan. Nothing was missing; everything was in the wrong place.
function recordTurnPositions(cache, present) {
    if(present.length && /^turn[:#]/.test(present[0].key)) {
        return recordPairPositions(cache, present);
    }
    if(!cache.gptpdfPos) {
        cache.gptpdfPos = new Map();
    }
    const pos = cache.gptpdfPos;
    const deltas = [];
    for(let i = 0; i < present.length; i++) {
        if(pos.has(present[i].key)) {
            deltas.push(present[i].n - pos.get(present[i].key));
        }
    }
    let d;
    if(deltas.length) {
        deltas.sort((a, b) => a - b);
        d = deltas[deltas.length >> 1];      // медиана: один сбойный турн не сдвинет всех
    } else if(pos.size === 0) {
        d = 0;                               // первый снимок задаёт начало отсчёта
    } else {
        return false;                        // прыжок: не к чему привязаться
    }
    for(let i = 0; i < present.length; i++) {
        if(!pos.has(present[i].key)) {
            pos.set(present[i].key, present[i].n - d);
        }
    }
    return true;
}

// Pair layout. Same coordinates, one difference: a snapshot that touches
// nothing known is not dropped but kept as an ISLAND — its turns placed
// against each other — and islands are sewn into the main line (or into each
// other) by the first snapshot that holds turns of both. The classic rule
// "no anchor, no position" leaves such turns to be placed later by some
// overlapping snapshot; here that snapshot may never come. If the page keeps
// the view on the TOP when an older stretch arrives, every stretch the climb
// meets at the top is unanchored, and the downward pass walks through them
// holding nothing it knows until it reaches the part seen first — the turns
// before that point would ship in capture order, not conversation order
// (tests/harvest-reversed-test.html, scene G). Measured behaviour is the
// opposite (the view keeps the bottom), but it is somebody else's measurement
// of a page we cannot open. Pair keys are stable, which is what makes an
// island safe to keep: the same key will name the same turn when it joins.
function recordPairPositions(cache, present) {
    if(!cache.gptpdfPos) {
        cache.gptpdfPos = new Map();
    }
    if(!cache.gptpdfIslands) {
        cache.gptpdfIslands = [];
    }
    const frames = [cache.gptpdfPos].concat(cache.gptpdfIslands);
    const median = (a) => a.sort((x, y) => x - y)[a.length >> 1];
    // Which frames this snapshot touches, and each one's shift.
    const touched = [];
    frames.forEach(function(f) {
        const deltas = [];
        present.forEach(function(p) {
            if(f.has(p.key)) {
                deltas.push(p.n - f.get(p.key));
            }
        });
        if(deltas.length) {
            touched.push({ frame: f, d: median(deltas) });
        }
    });
    let target, d;
    if(touched.length) {
        target = touched[0].frame;    // the main line comes first when touched
        d = touched[0].d;
    } else if(cache.gptpdfPos.size === 0) {
        target = cache.gptpdfPos;     // the first snapshot starts the main line
        d = 0;
    } else {
        target = new Map();           // an island
        cache.gptpdfIslands.push(target);
        d = 0;
    }
    // Sew every other touched frame into the target.
    for(let i = 1; i < touched.length; i++) {
        const f = touched[i].frame;
        const shift = touched[i].d - d;
        f.forEach(function(p, key) { target.set(key, p + shift); });
        cache.gptpdfIslands = cache.gptpdfIslands.filter(x => x !== f);
    }
    present.forEach(function(p) {
        if(!target.has(p.key)) {
            target.set(p.key, p.n - d);
        }
    });
    return target === cache.gptpdfPos;
}

// Порядок диалога = ключи, отсортированные по позиции. Острова (только новая
// вёрстка, см. recordPairPositions), так и не пришитые к основной линии, идут
// следом в порядке появления: выбросить сообщение хуже, чем поставить не туда.
function orderFromPositions(cache) {
    if(!cache.gptpdfPos) {
        return [];
    }
    const order = Array.from(cache.gptpdfPos.entries())
        .sort((a, b) => a[1] - b[1]).map(e => e[0]);
    (cache.gptpdfIslands || []).forEach(function(island) {
        Array.from(island.entries()).sort((a, b) => a[1] - b[1])
            .forEach(e => order.push(e[0]));
    });
    return order;
}

// One mounted turn into the cache. Returns its key, or null for an empty node.
// ChatGPT fills citation hrefs asynchronously: an early snapshot can have
// hrefless (blue, non-clickable) links. Track resolved-link counts so we keep
// the richest snapshot and know which turns still need their links.
function captureTurn(cache, t) {
    const html = t.innerHTML;
    if(html.length === 0) {
        return null;
    }
    const id = turnKey(t);
    const hrefs = t.querySelectorAll('a[href]').length;
    const unresolved = t.querySelectorAll('a.decorated-link:not([href])').length;
    const prev = cache.get(id);
    if(!prev || hrefs > prev.hrefs ||
       (hrefs === prev.hrefs && html.length > prev.len)) {
        cache.set(id, { html: t.outerHTML, hrefs: hrefs,
                        len: html.length, unresolved: unresolved });
    }
    return id;
}

function captureRenderedTurns(cache) {
    const turns = document.querySelectorAll(GPTPDF_TURN);
    const present = [];
    for(let i = 0; i < turns.length; i++) {
        const id = captureTurn(cache, turns[i]);
        if(id !== null) {
            present.push({ key: id, n: turnNumber(turns[i], i) });
        }
    }
    if(!recordTurnPositions(cache, present)) {
        cache.gptpdfOrderJumps = (cache.gptpdfOrderJumps || 0) + 1;
    }
}

let harvestCancelled = false;

function requestHarvestCancel() {
    harvestCancelled = true;
}

function showLoadingOverlay() {
    harvestCancelled = false;
    const ov = document.getElementById('gptpdf-loading-overlay');
    if(!ov) {
        return;
    }
    ov.classList.toggle('gptpdf-dark', !isLight(document.body));
    ov.style.display = 'flex';
    // Cancel belongs to the harvest phase; ensure visible (generation hides it).
    const _cancel = document.getElementById('gptpdf-cancel-loading');
    if(_cancel) _cancel.style.display = '';
    // Chrome throttles background tabs, which can break the harvest —
    // ask the user to keep the tab in front (STATE: DALL-E/tab-switch bug).
    const _card = ov.querySelector('.gptpdf-loading-card');
    if(_card && !_card.querySelector('.gptpdf-loading-hint')) {
        const hint = document.createElement('div');
        hint.className = 'gptpdf-loading-hint';
        hint.textContent = 'Please keep this tab open and in the foreground';
        hint.style.cssText =
            'font-size:12px;opacity:.75;margin-top:8px;text-align:center;max-width:250px;';
        _card.appendChild(hint);
    }
}

function hideLoadingOverlay() {
    const ov = document.getElementById('gptpdf-loading-overlay');
    if(ov) {
        ov.style.display = 'none';
    }
}

// Scrolls the chat top→bottom, caching each turn's HTML as it renders.
// Until 2026-07 ChatGPT's virtualizer kept placeholder nodes with empty
// innerHTML for off-screen turns, so "are there empty placeholders?" was a
// sound "is there more to render?" signal. It now UNMOUNTS off-screen turns:
// no placeholders remain, that signal silently answered "all rendered", the
// harvest returned without scrolling once, and the export shipped whatever
// window happened to be mounted — the same cut every time. The only honest
// signal left is scrollability: if the chat is taller than the viewport, the
// DOM cannot be trusted to hold it all, so harvest. Costs ~1s on medium chats.
// Phase 0 — climb to the real beginning of the conversation.
//
// An old chat is not in the DOM at all, and never was: ChatGPT holds a window
// of turns and fetches OLDER ones from the server as you scroll up. So
// `scrollTop = 0` lands at the top of what is currently LOADED — on an ancient
// chat that is somewhere in the middle, and everything above it has never
// existed in this tab. The downward pass then walks from there to the end, and
// the export starts wherever the page happened to be paginated (field report
// 2026-08-26: two runs in a row gave 40-60 pages, neither reached the start).
// Nothing downstream repairs it: the gap sweep only sees holes BETWEEN
// captured numbers, never a missing prefix, so the harvest reported success.
//
// So walk UP the way a reader would — step by step, capturing on the way — and
// at the top wait for the next page to be prepended. Done when the smallest
// turn number stops falling. Returns whether the first turn was reached.
// Position is read and set through `ax` (gptpdfScrollAxis): distance from the
// top, which on a classic scroller is scrollTop itself.
async function climbToConversationStart(scroller, ax, cache, budget) {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const up = Math.max(200, Math.floor(scroller.clientHeight * 0.7));
    let quietSince = 0;
    let topLoads = 0;
    // Ритм страницы. Тишины у верха мало: на живом ChatGPT сообщения приезжают
    // и пока мы шагаем, поэтому мерить надо интервал МЕЖДУ приходами — иначе
    // ритм читается как нулевой, и терпение схлопывается до пола (провал 08-27).
    let lastArrival = Date.now();
    let maxArrivalGap = 0;
    // Safety net against a page that yanks the list away from the top forever:
    // then scrollTop is never observed at zero, the quiet timer never starts,
    // and the loop bounces top-bottom without end. A genuine climb turns up new
    // turns every step or two, so a long run with nothing gained means we are
    // re-walking ground we already hold.
    let sinceGain = 0;
    // A prepended page shows up as the list growing by a chunk while we are
    // near its top. Counted purely as a diagnostic — it never steers the loop.
    // Threshold at one viewport so ordinary breathing (turns mounting and
    // unmounting around us) is not mistaken for a page arriving.
    let lastHeight = scroller.scrollHeight;
    for(let i = 0; i < 20000; i++) {
        if(harvestCancelled || budget.expired()) {
            break;
        }
        const before = ax.get();
        const seen = cache.size;
        if(++sinceGain > 200) {
            break;
        }
        if(before > 0) {
            ax.set(Math.max(0, before - up));
            await wait(200);
            captureRenderedTurns(cache);
            if(cache.size > seen) {
                sinceGain = 0;
                const gap = Date.now() - lastArrival;
                if(gap > maxArrivalGap) {
                    maxArrivalGap = gap;
                }
                lastArrival = Date.now();
            }
            if(cache.size > seen || ax.get() < before - 2) {
                budget.progress();
            }
            quietSince = 0;
            if(scroller.scrollHeight > lastHeight + scroller.clientHeight) {
                topLoads++;
            }
            lastHeight = scroller.scrollHeight;
        } else {
            // Pinned at the top: this is where a lazy loader fetches the
            // previous page. Nudge down and back up with a gap between, so
            // listeners that wake on a scroll DELTA fire too, not only the ones
            // watching a sentinel. The gap matters: set-and-revert inside one
            // task is a no-op the browser never reports as a scroll at all.
            // (A synthetic wheel event used to be dispatched here as a third
            // door. Removed 2026-08-27: measured over 212s of nudging, the page
            // made ZERO network calls either way, so it bought nothing — and it
            // was the likeliest trigger for the yank-to-bottom below.)
            const h0 = scroller.scrollHeight;
            ax.set(60);
            await wait(60);
            ax.set(0);
            await wait(CLIMB_NUDGE_MS);
            captureRenderedTurns(cache);
            // Only the list GROWING means content arrived. scrollTop being
            // pushed off zero does not: ChatGPT yanks the list back down when
            // the top is touched, and reading that as progress kept the climb
            // bouncing top-bottom-top for ten seconds on a four-message chat.
            const pageArrived =
                scroller.scrollHeight > h0 + scroller.clientHeight;
            if(pageArrived || scroller.scrollHeight > h0 + 8 ||
               cache.size > seen) {
                if(pageArrived) {
                    topLoads++;
                }
                const gap = Date.now() - lastArrival;
                if(gap > maxArrivalGap) {
                    maxArrivalGap = gap;
                }
                lastArrival = Date.now();
                lastHeight = scroller.scrollHeight;
                budget.progress();
                quietSince = 0;
                sinceGain = 0;
            } else {
                // Yanked back down with nothing gained: return to the top in
                // one move instead of climbing a screen at a time.
                if(ax.get() > scroller.clientHeight) {
                    ax.set(0);
                }
                // Whole conversation fits on screen and nothing has ever
                // arrived from above: there is no top to wait for. A long chat
                // never looks like this — a virtualized list keeps the full
                // height even when its turns are unmounted.
                if(topLoads === 0 &&
                   scroller.scrollHeight < scroller.clientHeight * 2) {
                    break;
                }
                if(!quietSince) {
                    quietSince = Date.now();
                }
                const limit = topLoads === 0 ? CLIMB_FIRST_WAIT_MS
                    : Math.min(CLIMB_MAX_PATIENCE_MS,
                        Math.max(CLIMB_MIN_PATIENCE_MS, maxArrivalGap * 3));
                if(Date.now() - quietSince > limit) {
                    break;
                }
            }
        }
        if(i % 4 === 0) {
            setHarvestProgress('Loading conversation... ' + cache.size +
                ' messages so far');
        }
    }
    // Deliberately NOT "did we reach turn 1". Field measurement 2026-08-26:
    // `[gptpdf] harvest: 39 turns (1→40) ... reached the start` on a chat whose
    // beginning was nowhere in the PDF — the number in data-testid counts the
    // LOADED window, not the conversation, and restarts as pages arrive. So the
    // only honest end is "we stood at the very top and nothing more came", plus
    // how much the top actually yielded.
    return { quietAtTop: quietSince > 0, topLoads: topLoads,
             maxArrivalGap: maxArrivalGap };
}

// ── Classic thread since 10-2026: the page lists every turn up front ─────
//
// Measured 06.10 on the author's chat of 516 turns (CHATGPT-DOM.md §10). The
// classic thread renders one wrapper per turn of the WHOLE conversation,
// `[data-turn-id-container="<turn id>"][data-is-intersecting]`, and only the
// content inside mounts, while the wrapper crosses the viewport (ChatGPT
// watches each one with an IntersectionObserver). Unmounted, a wrapper is an
// empty box with an estimated height; a turn the page never draws (system
// message, hidden tool call) is an empty box of zero height.
//
// So the page states its own table of contents — how many turns, which ones,
// in what order — and the harvest stops being a search. Once the older pages
// are in (loadOlderPages below: a signed-in tab holds only the newest page of
// a long chat), the first wrapper IS the first turn: no climb, no waiting at
// the top on a guess, no completeness guessed from turn numbers (they skip:
// №470 of that chat does not exist, and the gap sweep below would walk the
// whole chat twice looking for it). The walk: take the first turn not yet
// held, bring it to the top of the view, wait for IT to mount, take
// everything mounted, repeat. Order is the wrappers' DOM order.
// On the shared copy of that chat 1.1.11 needed ~11 minutes; this, 80–150 s
// for all 515 turns, in a hidden pane that draws 4× slower than a front tab.
//
// The descendants of a mounted turn carry `data-turn-id-container` too; the
// `data-is-intersecting` half of the selector is what keeps to the wrappers.
const GPTPDF_TURN_WRAPPER = '[data-turn-id-container][data-is-intersecting]';
// How long one turn may take to mount, and then to resolve its citation
// links (the old completeness pass gave links 1.5 s).
const WRAPPER_MOUNT_MS = 3000;
const WRAPPER_LINKS_MS = 1500;

function turnWrappers(root) {
    return Array.from(root.querySelectorAll(GPTPDF_TURN_WRAPPER));
}

function wrapperId(w) {
    return w.getAttribute('data-turn-id-container');
}

// The wrapper's turn, if it is mounted with content.
function wrapperTurn(w) {
    const t = w && w.querySelector(GPTPDF_TURN);
    return t && t.innerHTML.length > 0 ? t : null;
}

// A turn waiting to mount keeps an estimated height (min 56 px); a box with
// no content and no height is one the page will never draw.
function isHiddenWrapper(w) {
    return w.childElementCount === 0 && w.getBoundingClientRect().height === 0;
}

// The view is handed back by the turn the person was looking at, not by
// pixels: on the way every estimated height becomes a real one, and the old
// scrollTop lands somewhere else in the chat. At the bottom — back to it.
function viewAnchor(scroller) {
    if(scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 4) {
        return { bottom: true };
    }
    const top = scroller.getBoundingClientRect().top;
    const ws = turnWrappers(scroller);
    for(let i = 0; i < ws.length; i++) {
        const r = ws[i].getBoundingClientRect();
        if(r.bottom > top && r.height > 0) {
            return { id: wrapperId(ws[i]), off: r.top - top };
        }
    }
    return null;
}

async function restoreViewAnchor(scroller, anchor, origScroll) {
    if(!anchor) {
        await restoreScroll(scroller, origScroll);
        return;
    }
    for(let i = 0; i < 6; i++) {
        let d;
        if(anchor.bottom) {
            d = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
        } else {
            const w = scroller.querySelector('[data-turn-id-container="' +
                CSS.escape(anchor.id) + '"][data-is-intersecting]');
            if(!w) {
                return;
            }
            d = w.getBoundingClientRect().top -
                scroller.getBoundingClientRect().top - anchor.off;
        }
        if(Math.abs(d) <= 4) {
            return;
        }
        scroller.scrollTop += d;
        await new Promise(r => setTimeout(r, 80));
    }
}

// A tab in the background draws nothing, so nothing mounts there. Waiting it
// out is not a failure of the turn — and must not run the idle budget down.
async function waitForegroundTab(budget) {
    if(document.hidden) {
        setHarvestProgress('Paused: switch back to this tab to continue');
    }
    while(document.hidden && !harvestCancelled) {
        budget.progress();
        await new Promise(r => setTimeout(r, 250));
    }
}

// ── A signed-in tab holds a long chat in pages ───────────────────────────
//
// Found 06.10 in the page's own code (conversation-small-*.js), after the
// author's export on 1.1.12-dev began at question 202 of 257: the shared
// copy carries the whole chat, a signed-in tab only the NEWEST page of it.
// Above the first loaded turn sits a sentinel,
// `[data-testid="conversation-pagination-sentinel"]`, watched by an
// IntersectionObserver (root: the thread scroller, rootMargin 80px on top).
// When it ENTERS that zone, the page fetches the next older page from the
// server and prepends it, keeping the view in place. The sentinel exists
// exactly while older pages remain (the page's cursor is not null); while
// fetching it holds a spinner, after a failed fetch a "Try again" button.
//
// Two things follow. "Is there more above?" has an exact answer — the
// sentinel is there or not. And the fetch fires on ENTRY only: standing at the
// top does nothing, and the old climb's 60px nudge never left the 80px zone —
// how it stalled at 202 turns in August with "0 network requests" (§2). So the
// sentinel is taken well out of the zone and brought back, page after page,
// until it is gone; only then does the walk start, over a list that no longer
// grows under it.
const GPTPDF_PAGE_SENTINEL = '[data-testid="conversation-pagination-sentinel"]';
const PAGE_TRIGGER_MS = 2000;   // the fetch did not start: move out and in again
const PAGE_FETCH_MS = 30000;    // a slow server, one page

async function loadOlderPages(scroller, ax, budget) {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    // Wrappers only: mounted turns come and go with every scroll.
    const size = () => scroller.querySelectorAll(GPTPDF_TURN_WRAPPER).length;
    let pages = 0;
    let retries = 0;
    let deaf = 0;
    for(;;) {
        if(harvestCancelled || budget.expired()) {
            break;
        }
        if(document.hidden) {
            await waitForegroundTab(budget);
            continue;
        }
        const s = scroller.querySelector(GPTPDF_PAGE_SENTINEL);
        if(!s) {
            break;              // nothing older left: the start is loaded
        }
        const retry = s.querySelector('button');
        if(retry) {
            if(retries >= 3) {
                break;          // the server keeps failing: export what we have
            }
            retries++;
            retry.click();
            await wait(400);    // let the button give way to the spinner
        } else if(s.childElementCount === 0) {
            // Idle: out of the observer's zone (80px over the top), then in.
            const n = Math.max(scroller.clientHeight, 600);
            ax.set(n + 160);
            await wait(160);
            ax.set(0);
        }
        setHarvestProgress('Loading older messages... ' +
            (pages ? pages + (pages > 1 ? ' pages' : ' page') : ''));
        // A page counts as loaded by the page's own signs, never by the height
        // of the list: heights change all the time while estimated boxes get
        // real ones, and reading that as "a page came" loops forever on a
        // sentinel that never answers. The signs: more turn wrappers, or the
        // sentinel's spinner came and went, or the sentinel is gone.
        const n0 = size();
        const t0 = Date.now();
        let grew = false;
        let fetching = false;
        while(!harvestCancelled) {
            await wait(100);
            if(size() > n0) {
                grew = true;
                break;
            }
            const now = scroller.querySelector(GPTPDF_PAGE_SENTINEL);
            if(!now) {
                grew = fetching;
                break;
            }
            if(now.querySelector('button')) {
                break;
            }
            if(now.childElementCount > 0) {
                fetching = true;
            } else if(fetching) {
                grew = true;
                break;
            }
            if(Date.now() - t0 > (fetching ? PAGE_FETCH_MS : PAGE_TRIGGER_MS)) {
                break;
            }
        }
        if(grew) {
            pages++;
            deaf = 0;
            budget.progress();
            // Let the prepended turns get their boxes before the next round.
            await wait(150);
        } else if(!fetching && ++deaf >= 3) {
            break;              // the sentinel does not answer: report it
        }
    }
    return { pages: pages, retries: retries,
             stalled: !!scroller.querySelector(GPTPDF_PAGE_SENTINEL) };
}

async function harvestByWrappers(scroller, cache, budget) {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const keyOf = new Map();    // wrapper id → turn key, once held
    const seenKey = new Map();  // wrapper id → turn key, whenever captured
    const hidden = new Set();
    const tries = new Map();    // wrapper id → visits that saw nothing mount
    const find = (id) => scroller.querySelector(
        '[data-turn-id-container="' + CSS.escape(id) + '"][data-is-intersecting]');
    // Take every mounted turn not yet held. One with unresolved citation
    // links is taken but stays pending: its own visit waits for the links.
    const sweep = function() {
        turnWrappers(scroller).forEach(function(w) {
            const id = wrapperId(w);
            if(keyOf.has(id)) {
                return;
            }
            const t = wrapperTurn(w);
            const key = t && captureTurn(cache, t);
            if(key) {
                seenKey.set(id, key);
            }
            if(key && !cache.get(key).unresolved) {
                keyOf.set(id, key);
            }
        });
    };
    let steps = 0;
    let renderable = 0;
    sweep();
    for(;;) {
        if(harvestCancelled || budget.expired()) {
            break;
        }
        let target = null;
        renderable = 0;
        turnWrappers(scroller).forEach(function(w) {
            const id = wrapperId(w);
            if(hidden.has(id)) {
                return;
            }
            if(!keyOf.has(id) && isHiddenWrapper(w)) {
                hidden.add(id);
                return;
            }
            renderable++;
            if(!target && !keyOf.has(id) && (tries.get(id) || 0) < 2) {
                target = w;
            }
        });
        setHarvestProgress('Reading ' + keyOf.size + ' of ' + renderable +
            ' messages...');
        if(!target) {
            break;
        }
        const id = wrapperId(target);
        const delta = target.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top - 4;
        if(Math.abs(delta) > 2) {
            scroller.scrollTop += delta;
        }
        steps++;
        // Wait for the turn itself, not for a timer: first its content, then
        // its links. React may replace the wrapper node, so look it up anew.
        let mounted = false;
        let since = Date.now();
        while(!harvestCancelled) {
            if(document.hidden) {
                await waitForegroundTab(budget);
                since = Date.now();
                continue;
            }
            await wait(40);
            const t = wrapperTurn(find(id));
            if(t && !mounted) {
                mounted = true;
                since = Date.now();
            }
            if(t && !t.querySelector('a.decorated-link:not([href])')) {
                break;
            }
            if(Date.now() - since > (mounted ? WRAPPER_LINKS_MS : WRAPPER_MOUNT_MS)) {
                break;
            }
        }
        const held = keyOf.size;
        sweep();
        if(!keyOf.has(id)) {
            const t = mounted && wrapperTurn(find(id));
            const key = t && captureTurn(cache, t);
            if(key) {
                keyOf.set(id, key);     // links never resolved: keep the best we saw
                seenKey.set(id, key);
            } else {
                tries.set(id, (tries.get(id) || 0) + 1);
            }
        }
        if(keyOf.size > held) {
            budget.progress();
        }
    }
    // Every turn in the cache gets its wrapper's place, held or not: a turn
    // left out of the order is shipped at the very end by the rebuild, out of
    // place (the PDF of 06.10 had questions 204–206 after 256).
    const order = [];
    turnWrappers(scroller).forEach(function(w) {
        const key = keyOf.get(wrapperId(w)) || seenKey.get(wrapperId(w));
        if(key) {
            order.push(key);
        }
    });
    let failed = 0;
    tries.forEach(function(n, id) {
        if(!keyOf.has(id)) {
            failed++;
        }
    });
    return { order: order, renderable: renderable, held: keyOf.size,
             hidden: hidden.size, failed: failed, steps: steps };
}

async function harvestVirtualizedTurns() {
    const cache = new Map();
    const scroller = findVirtualizedScroller();
    if(!scroller) {
        return cache;
    }
    const origScroll = scroller.scrollTop;   // raw: handed back as it was
    const ax = gptpdfScrollAxis(scroller);
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    showLoadingOverlay();
    setHarvestProgress('Loading conversation...');
    const budget = makeHarvestBudget();
    let climb = { quietAtTop: false, topLoads: 0, maxArrivalGap: 0 };
    try {
        // The view to hand back is taken before anything moves; a wrapper
        // keeps its id through the pages prepended above it.
        const anchor = turnWrappers(scroller).length ? viewAnchor(scroller) : null;
        // Older pages first, so the walk goes over a list that no longer
        // grows: the start of the chat is loaded or we know it is not.
        const paged = await loadOlderPages(scroller, ax, budget);
        const pagesNote = (paged.pages ? ', ' + paged.pages + ' older pages loaded' : '') +
            (paged.stalled ? ', OLDER PAGES DID NOT LOAD (' + paged.retries + ' retries)' : '');
        if(harvestCancelled) {
            await restoreViewAnchor(scroller, anchor, origScroll);
            return cache;
        }
        if(turnWrappers(scroller).length) {
            const w = await harvestByWrappers(scroller, cache, budget);
            cache.gptpdfOrder = w.order;
            cache.gptpdfHarvest = {
                mode: 'wrappers',
                turns: cache.size, loaded: w.renderable,
                missing: Math.max(0, w.renderable - w.held),
                hidden: w.hidden, failed: w.failed, steps: w.steps,
                ordered: w.order.length,
                pages: paged.pages, pagesStalled: paged.stalled,
                cancelled: harvestCancelled,
                seconds: Math.round(budget.elapsed() / 1000)
            };
            console.log('[gptpdf] harvest: ' + w.held + ' of ' + w.renderable +
                ' turns by wrappers (hidden ' + w.hidden + ', failed ' +
                w.failed + ')' + pagesNote + ', ' + w.steps + ' steps' +
                (harvestCancelled ? ', cancelled' : '') + ', ' +
                Math.round(budget.elapsed() / 1000) + 's');
            await restoreViewAnchor(scroller, anchor, origScroll);
            return cache;
        }
        captureRenderedTurns(cache);
        // Up first, then down. Until 2026-08 the harvest only went down from
        // `scrollTop = 0`, which is the top of the loaded window, not the top
        // of the conversation — see climbToConversationStart().
        climb = await climbToConversationStart(scroller, ax, cache, budget);
        const _tClimb = budget.elapsed();
        if(harvestCancelled) {
            await restoreScroll(scroller, origScroll);
            return cache;
        }
        setHarvestProgress('Reading ' + cache.size + ' messages...');
        // The climb can end anywhere (start reached, nothing more arriving,
        // budget spent) — the downward pass must start from the top of what is
        // now loaded, not from wherever the climb happened to stop.
        const atTop = ax.get() <= 2;
        ax.set(0);
        await wait(atTop ? 120 : 350);   // после подъёма мы уже наверху
        captureRenderedTurns(cache);
        const step = Math.max(
            200, Math.floor(scroller.clientHeight * 0.7));
        // No fixed iteration ceiling: a step is a fraction of the viewport, so
        // a ceiling is a length limit in disguise. The loop is bounded by the
        // stuck-detection below and by the progress budget; this number is only
        // a backstop against a page that scrolls forever.
        const maxIter = 20000;
        let stableTries = 0;
        let stuckTries = 0;
        let lastHeight = scroller.scrollHeight;
        for(let i = 0; i < maxIter; i++) {
            if(harvestCancelled || budget.expired()) {
                break;
            }
            const before = ax.get();
            const seen = cache.size;
            const maxScroll =
                scroller.scrollHeight - scroller.clientHeight;
            const next = before + step;
            if(next >= maxScroll) {
                ax.set(scroller.scrollHeight);
                await wait(250);
                captureRenderedTurns(cache);
                if(scroller.scrollHeight === lastHeight) {
                    stableTries++;
                    if(stableTries >= 2) {
                        break;
                    }
                } else {
                    stableTries = 0;
                    lastHeight = scroller.scrollHeight;
                    budget.progress();
                }
                continue;
            }
            ax.set(next);
            await wait(220);
            captureRenderedTurns(cache);
            if(cache.size > seen) {
                budget.progress();
            }
            if(i % 8 === 0) {
                setHarvestProgress('Reading ' + cache.size + ' messages...');
            }
            // Position refusing to advance means the real bottom, even while
            // scrollHeight keeps shifting under us.
            if(ax.get() <= before + 2) {
                stuckTries++;
                if(stuckTries >= 4) {
                    break;
                }
            } else {
                stuckTries = 0;
                budget.progress();
            }
        }
        const _tDown = budget.elapsed();
        // Completeness pass: the fixed-delay scroll can miss turns that didn't
        // render in time. Catches only turns still MOUNTED (before 2026-07 that
        // meant every turn, thanks to placeholders; now it means the current
        // window) — scroll each into view and wait for IT to render. Turns that
        // were unmounted behind us are handled by the gap sweep below.
        for(let attempt = 0; attempt < 3 && !harvestCancelled; attempt++) {
            const pending = Array.from(document.querySelectorAll(
                GPTPDF_TURN
            )).filter(t => {
                const c = cache.get(turnKey(t));
                return !c || c.unresolved > 0;   // uncaptured, or links not resolved
            });
            if(pending.length === 0) {
                break;
            }
            for(let m = 0; m < pending.length; m++) {
                if(harvestCancelled) {
                    break;
                }
                pending[m].scrollIntoView();
                for(let w = 0; w < 30; w++) {       // up to ~1.5s for render + hrefs
                    const el = pending[m];
                    if(el.innerHTML.length > 0 && el.querySelectorAll(
                        'a.decorated-link:not([href])').length === 0) {
                        break;
                    }
                    await wait(50);
                }
                captureRenderedTurns(cache);
            }
        }
        // Gap sweep. The completeness pass above can only see turns still
        // mounted; a stretch the fast pass flew past is gone from the DOM and
        // shows up only as a hole in the numbering. Re-sweep slower to fill it.
        // A pair-layout page states no total (loadedTurnCount → null), so
        // there is no hole to count and the sweep does not run there.
        const stillMissing = () => {
            const loaded = loadedTurnCount();
            return loaded === null ? 0 : Math.max(0, loaded - cache.size);
        };
        for(let pass = 0; pass < 2 && !harvestCancelled; pass++) {
            if(budget.expired() || stillMissing() === 0) {
                break;
            }
            setHarvestProgress('Filling in ' + stillMissing() +
                ' missing messages...');
            ax.set(0);
            await wait(450);
            captureRenderedTurns(cache);
            const slow = Math.max(
                150, Math.floor(scroller.clientHeight * 0.45));
            for(let i = 0; i < maxIter; i++) {
                if(harvestCancelled || budget.expired()) {
                    break;
                }
                const before = ax.get();
                const seen = cache.size;
                ax.set(before + slow);
                await wait(260);
                captureRenderedTurns(cache);
                // Nothing left to fill — walking the rest of the chat again
                // costs minutes and can only find what is already held.
                if(stillMissing() === 0) {
                    break;
                }
                if(ax.get() <= before + 2) {
                    break;
                }
                budget.progress();
                if(cache.size > seen) {
                    budget.progress();
                }
            }
        }
        const _loaded = loadedTurnCount();   // null: the page states no total
        const _missing = _loaded === null ? null
            : Math.max(0, _loaded - cache.size);
        cache.gptpdfOrder = orderFromPositions(cache);
        cache.gptpdfHarvest = {
            turns: cache.size, loaded: _loaded,
            missing: _missing,
            reversed: ax.reversed(),
            topLoads: climb.topLoads, quietAtTop: climb.quietAtTop,
            maxArrivalGap: climb.maxArrivalGap,
            ordered: cache.gptpdfOrder.length,
            orderJumps: cache.gptpdfOrderJumps || 0,
            pages: paged.pages, pagesStalled: paged.stalled,
            cancelled: harvestCancelled,
            seconds: Math.round(budget.elapsed() / 1000),
            // Где время: подъём · спуск · доводка с добором. Без разбивки
            // «долго» — догадка, а догадки в этом коде уже дорого обошлись.
            ms: { climb: _tClimb, down: _tDown - _tClimb,
                  tail: budget.elapsed() - _tDown }
        };
        // Every number here is measured, none inferred. `loaded` is how much of
        // the conversation the page ended up holding; `top loaded: 0x` on a long
        // chat means standing at the top never made ChatGPT fetch an older
        // stretch — that is the thing to chase, and it is not about time.
        console.log('[gptpdf] harvest: ' + cache.size + ' of ' +
            (_loaded === null ? '?' : _loaded) +
            ' loaded turns, missing: ' + (_missing === null ? '?' : _missing) +
            (ax.reversed() ? ', bottom-origin thread' : '') +
            ', ordered: ' + cache.gptpdfOrder.length +
            ', top loaded: ' + climb.topLoads + 'x' +
            (climb.quietAtTop ? ' (top went quiet)' : ' (stopped early)') +
            pagesNote +
            ', ' + Math.round(budget.elapsed() / 1000) + 's' +
            ' (climb ' + Math.round(_tClimb / 100) / 10 +
            ' + down ' + Math.round((_tDown - _tClimb) / 100) / 10 +
            ' + tail ' + Math.round((budget.elapsed() - _tDown) / 100) / 10 + ')');
        await restoreScroll(scroller, origScroll);
    } finally {
        hideLoadingOverlay();
    }
    return cache;
}

// Polls until scrollTop sticks — virtualizer may resize scrollHeight
// while restoring, clamping the value until it re-renders.
async function restoreScroll(scroller, origScroll) {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    for(let i = 0; i < 6; i++) {
        scroller.scrollTop = origScroll;
        await wait(80);
        // Точного попадания ждать незачем: место возвращается человеку, а не
        // коду. Требование «ровно тот же пиксель» стоило до секунды на КАЖДОМ
        // экспорте, потому что виртуализатор подрезает значение при перерисовке.
        if(Math.abs(scroller.scrollTop - origScroll) <= 4) {
            return;
        }
    }
}

// Rebuilds the full conversation in the clone from the harvest.
// This used to only REPLACE turns: the clone carried a placeholder for every
// turn, so filling the empty ones was enough. Since 2026-07 the clone carries
// only the mounted window (e.g. 16, 18, 31, 37, 83…94 of a 94-turn chat), so
// harvested turns must be INSERTED — replacement alone silently dropped the
// whole conversation except that window. We merge both sides and re-lay the
// turns in numeric order, leaving the container's other children (spacers,
// disclaimer) where they are.
function restoreVirtualizedTurns(clone, cache) {
    if(gptpdfIsPairLayout(clone)) {
        restorePairThread(clone, cache);
        return;
    }
    if(!cache || cache.size === 0) {
        return;
    }
    const live = clone.querySelectorAll(
        '[data-testid^="conversation-turn"]');
    if(!live.length) {
        return;
    }
    const container = live[0].parentElement;
    if(!container) {
        return;
    }
    const merged = new Map();
    live.forEach(t => {
        merged.set(turnKey(t), {
            html: t.outerHTML,
            hrefs: t.querySelectorAll('a[href]').length,
            len: t.innerHTML.length
        });
    });
    // Keep whichever copy is richer: more resolved links first (fixes blue/
    // non-clickable inline links), then longer HTML.
    cache.forEach((cached, id) => {
        const cur = merged.get(id);
        if(!cur || cached.hrefs > cur.hrefs ||
           (cached.hrefs === cur.hrefs && cached.len > cur.len)) {
            merged.set(id, cached);
        }
    });
    // Order comes from the harvest, which recorded it by watching the DOM, not
    // by trusting turn numbers (they are renumbered under us — see turnKey).
    // Without a recorded order — an old cache, or a caller that never harvested
    // — fall back to the numeric sort, which is still right for a single
    // pagination generation.
    const known = (cache.gptpdfOrder && cache.gptpdfOrder.length)
        ? cache.gptpdfOrder : orderFromPositions(cache);
    let ordered;
    if(known.length) {
        ordered = [];
        const placed = new Set();
        known.forEach(k => {
            if(merged.has(k) && !placed.has(k)) {
                placed.add(k);
                ordered.push(k);
            }
        });
        // Anything the sweep never placed still has to ship. Capture order is a
        // guess, but dropping a message is not an option — silence is worse
        // than an odd position, and the count goes into the report.
        merged.forEach((_v, k) => {
            if(!placed.has(k)) {
                placed.add(k);
                ordered.push(k);
            }
        });
    } else {
        ordered = Array.from(merged.keys())
            .sort((a, b) => turnIndex(a) - turnIndex(b));
    }
    const frag = document.createDocumentFragment();
    const box = document.createElement('div');
    ordered.forEach(id => {
        box.innerHTML = merged.get(id).html;
        while(box.firstChild) {
            frag.appendChild(box.firstChild);
        }
    });
    container.insertBefore(frag, live[0]);
    live.forEach(t => t.remove());
}

// Pair layout: the export copy becomes the thread and nothing else. Two
// reasons it cannot be patched in place like the classic one. Every turn sits
// in a virtualizer slot with a fixed inline height ("height: 172px") around a
// box sized for the mounted window ("height: 408px"): ChatGPT's stylesheet,
// which normally has the last word, is not in the export, so those heights
// would clip the conversation the moment all of it is laid out. And the page
// around the thread — header, composer, banners — has no place in a PDF.
// Runs with or without a harvest: a short chat or a text selection has only
// the turns already in the copy, and they still need their slots taken off.
function restorePairThread(clone, cache) {
    const merged = new Map();
    const live = clone.querySelectorAll('div[data-turn-key]');
    live.forEach(t => {
        merged.set(turnKey(t), {
            html: t.outerHTML,
            hrefs: t.querySelectorAll('a[href]').length,
            len: t.innerHTML.length
        });
    });
    if(cache) {
        cache.forEach((cached, id) => {
            const cur = merged.get(id);
            if(!cur || cached.hrefs > cur.hrefs ||
               (cached.hrefs === cur.hrefs && cached.len > cur.len)) {
                merged.set(id, cached);
            }
        });
    }
    // Order from the harvest; then anything it never placed — the copy's own
    // turns in document order first, which is conversation order here.
    const known = !cache ? [] : (cache.gptpdfOrder && cache.gptpdfOrder.length)
        ? cache.gptpdfOrder : orderFromPositions(cache);
    const ordered = [];
    const placed = new Set();
    const place = k => {
        if(merged.has(k) && !placed.has(k)) {
            placed.add(k);
            ordered.push(k);
        }
    };
    known.forEach(place);
    live.forEach(t => place(turnKey(t)));
    merged.forEach((_v, k) => place(k));

    const thread = document.createElement('div');
    thread.className = 'gptpdf-thread';
    const box = document.createElement('div');
    ordered.forEach(id => {
        box.innerHTML = merged.get(id).html;
        while(box.firstChild) {
            thread.appendChild(box.firstChild);
        }
    });
    while(clone.firstChild) {
        clone.removeChild(clone.firstChild);
    }
    clone.appendChild(thread);
}

// ─────────────────────────────────────────────────────────────────────
// Rate Us state
let gptpdfRateUsMode = false;
let gptpdfDropdownOpen = false;
// ─────────────────────────────────────────────────────────────────────
