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
    const t = document.querySelector('#gptpdf-progress .gptpdf-loading-text');
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
    // The cap is charged only for work: a tab in the background and the
    // paging that comes before the walk do not eat the walk's 15 minutes
    // (review 06.10: a long paging or a long pause left the walk 0 steps).
    let capFrom = started;
    return {
        progress: function() { last = Date.now(); },
        elapsed: function() { return Date.now() - started; },
        restart: function() { last = capFrom = Date.now(); },
        pause: function(ms) { capFrom += ms; last = Date.now(); },
        expired: function() {
            const now = Date.now();
            return now - last > HARVEST_IDLE_MS ||
                   now - capFrom > HARVEST_CAP_MS;
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

// A picture a turn will show but has not got yet: the slot of a code run's
// output picture (a matplotlib chart) is drawn empty with the text, and its
// <img> comes about a second later, once ChatGPT has fetched the file
// (measured 07.10 on «мудрец»: text at 0.4 s, picture at 1.4 s). A snapshot
// taken in between has no picture — two charts were lost from every export.
// ChatGPT's live graph is the same kind of late: its block shows a spinner
// and "Loading" (role=status) for seconds before the SVG — exported then, the
// PDF got a page-wide spinner (author's test chat, 08.10; ~9 s to draw).
const GPTPDF_PENDING_PICTURE = '.flex-wrap > [class*="max-h-64"]:not(:has(img)), ' +
    '[data-testid="math-block-layout"] [role="status"]';

// What a mounted turn still waits for: hrefless citation links, pictures.
function turnPending(t) {
    return t.querySelectorAll('a.decorated-link:not([href])').length +
        t.querySelectorAll(GPTPDF_PENDING_PICTURE).length;
}

// One mounted turn into the cache. Returns its key, or null for an empty node.
// ChatGPT fills citation hrefs and output pictures asynchronously: an early
// snapshot can have hrefless (blue, non-clickable) links or an empty picture
// slot. Track what is still pending so we keep the richest snapshot and know
// which turns still need waiting for.
function captureTurn(cache, t) {
    const html = t.innerHTML;
    if(html.length === 0) {
        return null;
    }
    const id = turnKey(t);
    const hrefs = t.querySelectorAll('a[href]').length;
    const unresolved = turnPending(t);
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

// ── The progress card ─────────────────────────────────────────────────────
//
// One card from the click to the file (author's word 07.10: a person left
// without words for 20 seconds starts to doubt the file will ever come).
// Three lines: what is happening now, a fact about how ChatGPT works while the
// wait is long, and what the person may do meanwhile. Every claim is measured
// (CHATGPT-DOM.md §10, 07.10): in a hidden tab ChatGPT stops putting messages
// on the page, so the scrolling waits; after the scrolling the export finishes
// in a hidden tab too, a third slower.
const GPTPDF_FACT_PARTS =
    'ChatGPT sends long chats in parts of about 10 messages.';
const GPTPDF_FACT_REQUEST = 'Each part is a separate request to ChatGPT\'s ' +
    'server and takes a few seconds.';
// The first thing said, at 10 s of scrolling, is what the person must do —
// not how ChatGPT works (author's word 07.10: «оно через 10 секунд после
// начала несло бы пользу»). Loading's facts come once it has taken 30 s: one
// thing at a time, when the wait has become a long one. Reading starts with
// that hint already up, so its fact comes at its 10th second — on a chat of a
// hundred messages the reading is over before 30 s.
const GPTPDF_HINT_STAY = 'Don\'t switch tabs or minimize the window yet: ' +
    'the export pauses while this tab is hidden.';
const GPTPDF_HINT_AFTER_MS = 10000;
const GPTPDF_FACT_AFTER_MS = 30000;
const GPTPDF_FACT_READING_AFTER_MS = 10000;
const GPTPDF_FACT_SCREEN = 'ChatGPT draws only the messages on screen, ' +
    'so each one is scrolled into view to be copied.';
// A step's facts take turns every 20 s, round and round (author's word 07.10:
// one text that never changes for a minute reads as a frozen card).
const GPTPDF_FACTS_LOADING = [GPTPDF_FACT_PARTS, GPTPDF_FACT_REQUEST];
const GPTPDF_FACTS_READING = [GPTPDF_FACT_SCREEN];
const GPTPDF_FACT_EVERY_MS = 20000;
// Not said in advance (author's word 07.10: small print from the very start
// is one more thing to read). Said once it explains something that happened:
// the tab was hidden, the reading stopped, the person is back. It takes the
// place of GPTPDF_HINT_STAY, and STAY never replaces it.
const GPTPDF_HINT_WAS_HIDDEN = 'The export waited while this tab was hidden: ' +
    'ChatGPT loads messages only in a visible tab.';
const GPTPDF_HINT_LEAVE = 'You can keep using ChatGPT or switch tabs — the ' +
    'file will download by itself. Don\'t close or reload this tab.';
const GPTPDF_FACT_LONG = 'Long chats take longer.';

function gptpdfCardLine(cls, text) {
    const el = document.querySelector('#gptpdf-progress .' + cls);
    if(el && el.textContent !== (text || '')) {
        el.textContent = text || '';
    }
}

function gptpdfSetFact(text) {
    gptpdfCardLine('gptpdf-loading-fact', text);
}

// The fact a step shows `ms` into it: none before `after`, then in turns.
function gptpdfFactAt(facts, ms, after) {
    if(ms < after || !facts.length) {
        return '';
    }
    return facts[Math.floor((ms - after) / GPTPDF_FACT_EVERY_MS) % facts.length];
}

function gptpdfSetHint(text) {
    gptpdfCardLine('gptpdf-loading-hint', text);
}

// The panel under the Export button, and the dimming of the page under it.
// While the chat is being read the page must stay still, so it is dimmed and
// does not take clicks. From "Compressing images" on the export works on its own
// copy and the page is the person's again (author's word 07.10): no dimming,
// the panel stays where it was — one place for the whole export.
function gptpdfShowCard(withCancel, passive) {
    const card = document.getElementById('gptpdf-progress');
    const ov = document.getElementById('gptpdf-loading-overlay');
    if(!card) {
        return;
    }
    const dark = !isLight(document.body);
    card.classList.toggle('gptpdf-dark', dark);
    card.style.display = 'flex';
    const block = card.closest('.gptpdf-block');
    if(block) {
        block.classList.add('gptpdf-exporting');
    }
    if(ov) {
        ov.classList.toggle('gptpdf-dark', dark);
        ov.style.display = passive ? 'none' : 'block';
    }
    // Cancel stops the scrolling only; after it there is nothing to stop.
    const cancel = document.getElementById('gptpdf-cancel-loading');
    if(cancel) {
        cancel.style.display = withCancel ? '' : 'none';
    }
}

function gptpdfCardVisible() {
    const card = document.getElementById('gptpdf-progress');
    return !!card && card.style.display === 'flex';
}

function showLoadingOverlay() {
    harvestCancelled = false;
    gptpdfExportCard.shown = true;
    gptpdfShowCard(true, false);
    gptpdfSetFact('');
    gptpdfSetHint('');
}

function hideLoadingOverlay() {
    const card = document.getElementById('gptpdf-progress');
    const ov = document.getElementById('gptpdf-loading-overlay');
    if(ov) {
        ov.style.display = 'none';
    }
    if(card) {
        card.style.display = 'none';
        const block = card.closest('.gptpdf-block');
        if(block) {
            block.classList.remove('gptpdf-exporting');
        }
    }
}

// ── After the scrolling: the same card goes on to the file ────────────────
// A short export (a chat that fits the screen, a few seconds in all) shows the
// card only if it is still running after GPTPDF_CARD_DELAY_MS — a card that
// flashes for half a second says nothing. Once the scrolling has shown it, it
// stays: the gap between the scrolling and the next step read as "it stopped".
const GPTPDF_CARD_DELAY_MS = 3000;
const GPTPDF_LONG_AFTER_MS = 20000;
const gptpdfExportCard = { tick: null, delay: null, shown: false };

function gptpdfExportStep(text, hint, passive) {
    setHarvestProgress(text);
    gptpdfSetFact('');
    gptpdfSetHint(hint || '');
    gptpdfExportCard.passive = !!passive;
    if(gptpdfCardVisible() || gptpdfExportCard.shown) {
        clearTimeout(gptpdfExportCard.delay);
        gptpdfExportCard.delay = null;
        gptpdfShowCard(false, passive);
    } else if(!gptpdfExportCard.delay) {
        gptpdfExportCard.delay = setTimeout(function() {
            gptpdfExportCard.delay = null;
            gptpdfShowCard(false, gptpdfExportCard.passive);
        }, GPTPDF_CARD_DELAY_MS);
    }
}

// "Adding images… 12 of 48" reads the live page (keep it still);
// "Compressing images… 5 of 30" works on the export's own copy (page free).
function gptpdfExportImages(verb, done, total, passive) {
    if(total > 0) {
        gptpdfExportStep(verb + '… ' + done + ' of ' + total, '', passive);
    }
}

// "Creating the PDF from 513 messages…" — the server's part. No clock of
// its own: the one number is the Export button's (author's word 07.10: two
// counters in two places with two values look disorganised). After 20 s a
// plain "long chats take longer" under it.
function gptpdfExportServer(messages) {
    clearTimeout(gptpdfExportCard.tick);
    const what = messages ? ' from ' + messages +
        (messages === 1 ? ' message' : ' messages') : '';
    gptpdfExportStep('Creating the PDF' + what + '…', GPTPDF_HINT_LEAVE, true);
    gptpdfExportCard.tick = setTimeout(function() {
        gptpdfSetFact(GPTPDF_FACT_LONG);
    }, GPTPDF_LONG_AFTER_MS);
}

// The title dialog asks in the middle of an export: the card steps aside.
function gptpdfExportPause() {
    clearTimeout(gptpdfExportCard.delay);
    gptpdfExportCard.delay = null;
    hideLoadingOverlay();
}

// A new export starts with no card owed: block mode's entry scrolling, long
// before its export, does not count.
function gptpdfExportBegin() {
    gptpdfExportEnd();
}

function gptpdfExportEnd() {
    clearTimeout(gptpdfExportCard.tick);
    clearTimeout(gptpdfExportCard.delay);
    gptpdfExportCard.tick = gptpdfExportCard.delay = null;
    gptpdfExportCard.shown = false;
    hideLoadingOverlay();
    gptpdfSetFact('');
    gptpdfSetHint('');
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
// An output picture has its own wait, and the dead-links shortcut (400 ms once
// three turns sat with links that never resolve) does not cut it: the picture
// comes about a second after the text, and on a chat with dead links the
// shortcut is on from the start (07.10, «мудрец»: both charts still lost).
const WRAPPER_PICTURE_MS = 4000;

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
// Returns how long it waited, so callers can keep that time off their clocks.
async function waitForegroundTab(budget) {
    const t0 = Date.now();
    if(document.hidden) {
        setHarvestProgress('Paused: switch back to this tab to continue');
    }
    while(document.hidden && !harvestCancelled) {
        budget.progress();
        await new Promise(r => setTimeout(r, 250));
    }
    const paused = Date.now() - t0;
    if(paused > 0) {
        budget.pause(paused);
    }
    // A blink of "hidden" (a window coming to front) explains nothing; an
    // absence does — said on return, under the line that goes on again.
    if(paused >= 1000 && !harvestCancelled) {
        gptpdfSetHint(GPTPDF_HINT_WAS_HIDDEN);
    }
    return paused;
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
// Paging has a clock of its own. It used to spend the harvest's shared idle
// budget: one hung fetch (a spinner that never clears) or a few slow "Try
// again" rounds ran it out, and the walk that followed stopped before its
// first step — the PDF held only the turns on screen and the report said
// nothing was missing (review 06.10, reproduced on scratch stands).
const PAGES_IDLE_MS = 45000;    // no answer for this long: the rest is not coming
const PAGES_MAX_FAILS = 3;      // failed rounds in a row, not in total
const PAGES_MAX_EMPTY = 4;      // answers that added nothing, in a row
const PAGES_CAP_MS = 10 * 60 * 1000;   // a page that keeps answering forever

async function loadOlderPages(scroller, ax, budget) {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    // Wrappers only: mounted turns come and go with every scroll.
    const size = () => scroller.querySelectorAll(GPTPDF_TURN_WRAPPER).length;
    const started = Date.now();
    let capFrom = started;
    let lastPage = started;
    let pages = 0;
    let retries = 0;
    let fails = 0;      // in a row: a long chat may hit several transient ones
    let deaf = 0;
    let empty = 0;      // the spinner came and went and nothing was added
    let factTimer = null;
    for(;;) {
        if(harvestCancelled || Date.now() - lastPage > PAGES_IDLE_MS ||
           Date.now() - capFrom > PAGES_CAP_MS) {
            break;
        }
        if(document.hidden) {
            const paused = await waitForegroundTab(budget);
            lastPage += paused;             // a hidden tab is not a silent server
            capFrom += paused;
            continue;
        }
        const s = scroller.querySelector(GPTPDF_PAGE_SENTINEL);
        if(!s) {
            break;              // nothing older left: the start is loaded
        }
        // Counted before anything is touched: a retry or a fetch that lands
        // within the first wait would otherwise go unseen.
        const n0 = size();
        const h0 = scroller.scrollHeight;
        const retry = s.querySelector('button');
        if(retry) {
            if(fails >= PAGES_MAX_FAILS) {
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
        setHarvestProgress('Loading older messages…' + (pages ? ' ' + pages +
            (pages > 1 ? ' parts' : ' part') : ''));
        // Its own clock: a round can sit for the server up to PAGE_FETCH_MS,
        // and the facts take turns meanwhile.
        if(!factTimer) {
            factTimer = setInterval(function() {
                gptpdfSetFact(gptpdfFactAt(GPTPDF_FACTS_LOADING,
                    Date.now() - started, GPTPDF_FACT_AFTER_MS));
            }, 500);
        }
        // A page counts as loaded by the page's own signs, never by the height
        // of the list: heights change all the time while estimated boxes get
        // real ones, and reading that as "a page came" loops forever on a
        // sentinel that never answers. The signs: more turn wrappers, or the
        // sentinel's spinner came and went, or the sentinel is gone.
        const t0 = Date.now();
        let fetching = false;
        let answered = false;   // the spinner came and went
        let failedNow = false;  // the round ended on "Try again"
        while(!harvestCancelled) {
            await wait(100);
            if(size() > n0) {
                break;
            }
            const now = scroller.querySelector(GPTPDF_PAGE_SENTINEL);
            if(!now) {
                answered = fetching;
                break;
            }
            if(now.querySelector('button')) {
                failedNow = true;
                break;
            }
            if(now.childElementCount > 0) {
                fetching = true;
            } else if(fetching) {
                answered = true;
                break;
            }
            if(Date.now() - t0 > (fetching ? PAGE_FETCH_MS : PAGE_TRIGGER_MS)) {
                break;
            }
        }
        // A page is real only when something was added: more wrappers, or —
        // on a page without wrappers — a list taller by more than half a
        // screen after the spinner. "The spinner came and went" alone also
        // happens when nothing moves (an empty page, a cursor that does not
        // advance), and counting that as a page looped forever (review 06.10).
        const added = size() > n0 || (answered && !size() &&
            scroller.scrollHeight > h0 + scroller.clientHeight / 2);
        if(added) {
            pages++;
            deaf = 0;
            fails = 0;
            empty = 0;
            lastPage = Date.now();
            budget.progress();
            // Let the prepended turns get their boxes before the next round.
            await wait(150);
        } else if(failedNow) {
            // An answer, even a failing one, is not silence: a fetch that
            // failed after 50 s still gets its "Try again".
            fails++;
            lastPage = Date.now();
        } else if(answered) {
            lastPage = Date.now();
            if(++empty >= PAGES_MAX_EMPTY) {
                break;
            }
        } else if(fetching || retry) {
            fails++;            // a spinner that outlived its wait, or a retry that did not take
            if(fails >= PAGES_MAX_FAILS) {
                break;
            }
        } else if(++deaf >= 3) {
            break;              // the sentinel does not answer: report it
        }
    }
    clearInterval(factTimer);
    return { pages: pages, retries: retries, ms: Date.now() - started,
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
                // Held with links still hrefless: while it stays mounted, keep
                // taking the richer snapshot — no waiting, and a link that
                // resolves after its step still reaches the PDF.
                const held = cache.get(keyOf.get(id));
                const t = held && held.unresolved && wrapperTurn(w);
                if(t) {
                    captureTurn(cache, t);
                }
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
    // Где уходит время шага: ожидание монтажа и ожидание ссылок-цитат.
    let mountMs = 0;
    let linkMs = 0;
    const walkFrom = Date.now();
    let deadLinks = 0;  // turns that sat the full link wait with nothing resolving
    sweep();
    for(;;) {
        // The list is read before any exit, so a walk cut short still
        // reports how much it left behind instead of "0 of 0, none missing".
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
            ' messages…');
        gptpdfSetFact(gptpdfFactAt(GPTPDF_FACTS_READING,
            Date.now() - walkFrom, GPTPDF_FACT_READING_AFTER_MS));
        if(!target || harvestCancelled || budget.expired()) {
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
        // Citation links. The full wait (1.5 s) stays the rule until this
        // chat shows that its hrefless links do not resolve: after three turns
        // that sat the full wait with nothing resolving, a turn is let go once
        // its links stop moving for 400 ms. Progress is links GAINING an href
        // (pills may still be appearing, so a falling hrefless count can lie).
        // A full 1.5 s on every turn with dead links is minutes on a long chat;
        // cutting every turn at 400 ms dropped links that start late (review).
        let mounted = false;
        let since = Date.now();
        let stepStart = since;
        let resolved = -1;
        let moved = false;
        let lastResolve = since;
        while(!harvestCancelled) {
            if(document.hidden) {
                const paused = await waitForegroundTab(budget);
                stepStart += paused;
                since += paused;
                lastResolve += paused;
                continue;
            }
            await wait(40);
            const t = wrapperTurn(find(id));
            if(t && !mounted) {
                mounted = true;
                mountMs += Date.now() - stepStart;
                since = Date.now();
                lastResolve = since;
            }
            let pictures = 0;
            if(t) {
                if(!turnPending(t)) {
                    break;
                }
                pictures = t.querySelectorAll(GPTPDF_PENDING_PICTURE).length;
                const now = t.querySelectorAll('a.decorated-link[href], img').length;
                if(resolved >= 0 && now > resolved) {
                    moved = true;
                    lastResolve = Date.now();
                }
                resolved = Math.max(resolved, now);
                if(!pictures && (moved || deadLinks >= 3) &&
                   Date.now() - lastResolve > 400) {
                    break;
                }
            }
            if(Date.now() - since > (!mounted ? WRAPPER_MOUNT_MS :
                    pictures ? WRAPPER_PICTURE_MS : WRAPPER_LINKS_MS)) {
                if(mounted && !moved && !pictures) {
                    deadLinks++;
                }
                break;
            }
        }
        if(mounted) {
            linkMs += Date.now() - since;
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
             hidden: hidden.size, failed: failed, steps: steps,
             mountMs: mountMs, linkMs: linkMs };
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
    // Only into an empty line: a person who already left and came back
    // has the explanation of what happened, not a warning.
    const stayTimer = setTimeout(function() {
        const hint = document.querySelector('#gptpdf-progress .gptpdf-loading-hint');
        if(hint && !hint.textContent) {
            gptpdfSetHint(GPTPDF_HINT_STAY);
        }
    }, GPTPDF_HINT_AFTER_MS);
    const budget = makeHarvestBudget();
    let climb = { quietAtTop: false, topLoads: 0, maxArrivalGap: 0 };
    try {
        // The view to hand back is taken before anything moves; a wrapper
        // keeps its id through the pages prepended above it.
        const anchor = turnWrappers(scroller).length ? viewAnchor(scroller) : null;
        // Older pages first, so the walk goes over a list that no longer
        // grows: the start of the chat is loaded or we know it is not.
        const paged = await loadOlderPages(scroller, ax, budget);
        // Paging kept its own clock; the walk starts with a full one.
        budget.restart();
        const sec = (ms) => Math.round(ms / 100) / 10;
        const pagesNote = (paged.pages ? ', ' + paged.pages + ' older pages loaded in ' +
                sec(paged.ms) + 's' : '') +
            (paged.stalled ? ', OLDER PAGES DID NOT LOAD (' + paged.retries + ' retries)' : '');
        // The build in the harvest line itself: with two copies of the
        // extension in one browser, only this line tells which one exported
        // (06.10: the dev build announced itself, the store copy did the work).
        const build = ' [' + (typeof gptpdfShared !== 'undefined' &&
            gptpdfShared.build || '?') + ']';
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
                seconds: Math.round(budget.elapsed() / 1000),
                ms: { pages: paged.ms, mount: w.mountMs, links: w.linkMs }
            };
            console.log('[gptpdf] harvest' + build + ': ' + w.held + ' of ' +
                w.renderable + ' turns by wrappers (hidden ' + w.hidden +
                ', failed ' + w.failed + ')' + pagesNote + ', ' + w.steps +
                ' steps (waiting: mount ' + sec(w.mountMs) + 's, links ' +
                sec(w.linkMs) + 's)' + (harvestCancelled ? ', cancelled' : '') +
                ', ' + Math.round(budget.elapsed() / 1000) + 's');
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
                setHarvestProgress('Reading ' + cache.size + ' messages…');
                gptpdfSetFact(gptpdfFactAt(GPTPDF_FACTS_READING,
                    budget.elapsed(), GPTPDF_FACT_READING_AFTER_MS));
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
        console.log('[gptpdf] harvest' + build + ': ' + cache.size + ' of ' +
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
        clearTimeout(stayTimer);
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
