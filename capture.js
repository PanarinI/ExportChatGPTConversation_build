'use strict';

// Capture the virtualized ChatGPT conversation before cloning: scroll-harvest of
// off-screen turns, cancel flag, loading overlay. `harvestCancelled` is shared
// (also read by convert() and block-mode in common.js).

function findVirtualizedScroller() {
    const turns = document.querySelectorAll(
        '[data-testid^="conversation-turn"]');
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
function turnKey(t) {
    const m = t.querySelector('[data-message-id]');
    const id = m && m.getAttribute('data-message-id');
    return id ? 'msg:' + id : (t.getAttribute('data-testid') || '');
}

// How many turns the page holds right now, read as the highest turn number in
// the DOM. Numbering is window-relative, so this is the size of the LOADED
// conversation at this moment — the only total the page ever states out loud.
function loadedTurnCount() {
    const turns = document.querySelectorAll(
        '[data-testid^="conversation-turn"]');
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

// Порядок диалога = ключи, отсортированные по позиции.
function orderFromPositions(cache) {
    if(!cache.gptpdfPos) {
        return [];
    }
    return Array.from(cache.gptpdfPos.entries())
        .sort((a, b) => a[1] - b[1]).map(e => e[0]);
}

function captureRenderedTurns(cache) {
    const turns = document.querySelectorAll(
        '[data-testid^="conversation-turn"]');
    const present = [];
    for(let i = 0; i < turns.length; i++) {
        const t = turns[i];
        const html = t.innerHTML;
        if(html.length === 0) {
            continue;
        }
        const id = turnKey(t);
        present.push({ key: id,
                       n: turnIndex(t.getAttribute('data-testid')) });
        // ChatGPT fills citation hrefs asynchronously: an early snapshot can have
        // hrefless (blue, non-clickable) links. Track resolved-link counts so we
        // keep the richest snapshot and know which turns still need their links.
        const hrefs = t.querySelectorAll('a[href]').length;
        const unresolved = t.querySelectorAll('a.decorated-link:not([href])').length;
        const prev = cache.get(id);
        if(!prev || hrefs > prev.hrefs ||
           (hrefs === prev.hrefs && html.length > prev.len)) {
            cache.set(id, { html: t.outerHTML, hrefs: hrefs,
                            len: html.length, unresolved: unresolved });
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
async function climbToConversationStart(scroller, cache, budget) {
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
        const before = scroller.scrollTop;
        const seen = cache.size;
        if(++sinceGain > 200) {
            break;
        }
        if(before > 0) {
            scroller.scrollTop = Math.max(0, before - up);
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
            if(cache.size > seen || scroller.scrollTop < before - 2) {
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
            scroller.scrollTop = 60;
            await wait(60);
            scroller.scrollTop = 0;
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
                if(scroller.scrollTop > scroller.clientHeight) {
                    scroller.scrollTop = 0;
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

async function harvestVirtualizedTurns() {
    const cache = new Map();
    const scroller = findVirtualizedScroller();
    if(!scroller) {
        return cache;
    }
    const origScroll = scroller.scrollTop;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    showLoadingOverlay();
    setHarvestProgress('Loading conversation...');
    const budget = makeHarvestBudget();
    let climb = { quietAtTop: false, topLoads: 0, maxArrivalGap: 0 };
    try {
        captureRenderedTurns(cache);
        // Up first, then down. Until 2026-08 the harvest only went down from
        // `scrollTop = 0`, which is the top of the loaded window, not the top
        // of the conversation — see climbToConversationStart().
        climb = await climbToConversationStart(scroller, cache, budget);
        const _tClimb = budget.elapsed();
        if(harvestCancelled) {
            await restoreScroll(scroller, origScroll);
            return cache;
        }
        setHarvestProgress('Reading ' + cache.size + ' messages...');
        // The climb can end anywhere (start reached, nothing more arriving,
        // budget spent) — the downward pass must start from the top of what is
        // now loaded, not from wherever the climb happened to stop.
        const atTop = scroller.scrollTop <= 2;
        scroller.scrollTop = 0;
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
            const before = scroller.scrollTop;
            const seen = cache.size;
            const maxScroll =
                scroller.scrollHeight - scroller.clientHeight;
            const next = before + step;
            if(next >= maxScroll) {
                scroller.scrollTop = scroller.scrollHeight;
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
            scroller.scrollTop = next;
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
            if(scroller.scrollTop <= before + 2) {
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
                '[data-testid^="conversation-turn"]'
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
        const stillMissing = () =>
            Math.max(0, loadedTurnCount() - cache.size);
        for(let pass = 0; pass < 2 && !harvestCancelled; pass++) {
            if(budget.expired() || stillMissing() === 0) {
                break;
            }
            setHarvestProgress('Filling in ' + stillMissing() +
                ' missing messages...');
            scroller.scrollTop = 0;
            await wait(450);
            captureRenderedTurns(cache);
            const slow = Math.max(
                150, Math.floor(scroller.clientHeight * 0.45));
            for(let i = 0; i < maxIter; i++) {
                if(harvestCancelled || budget.expired()) {
                    break;
                }
                const before = scroller.scrollTop;
                const seen = cache.size;
                scroller.scrollTop = before + slow;
                await wait(260);
                captureRenderedTurns(cache);
                // Nothing left to fill — walking the rest of the chat again
                // costs minutes and can only find what is already held.
                if(stillMissing() === 0) {
                    break;
                }
                if(scroller.scrollTop <= before + 2) {
                    break;
                }
                budget.progress();
                if(cache.size > seen) {
                    budget.progress();
                }
            }
        }
        const _loaded = loadedTurnCount();
        cache.gptpdfOrder = orderFromPositions(cache);
        cache.gptpdfHarvest = {
            turns: cache.size, loaded: _loaded,
            missing: Math.max(0, _loaded - cache.size),
            topLoads: climb.topLoads, quietAtTop: climb.quietAtTop,
            maxArrivalGap: climb.maxArrivalGap,
            ordered: cache.gptpdfOrder.length,
            orderJumps: cache.gptpdfOrderJumps || 0,
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
        console.log('[gptpdf] harvest: ' + cache.size + ' of ' + _loaded +
            ' loaded turns, missing: ' + Math.max(0, _loaded - cache.size) +
            ', ordered: ' + cache.gptpdfOrder.length +
            ', top loaded: ' + climb.topLoads + 'x' +
            (climb.quietAtTop ? ' (top went quiet)' : ' (stopped early)') +
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

// ─────────────────────────────────────────────────────────────────────
// Rate Us state
let gptpdfRateUsMode = false;
let gptpdfDropdownOpen = false;
// ─────────────────────────────────────────────────────────────────────
