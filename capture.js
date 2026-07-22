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

function captureRenderedTurns(cache) {
    const turns = document.querySelectorAll(
        '[data-testid^="conversation-turn"]');
    for(let i = 0; i < turns.length; i++) {
        const t = turns[i];
        const html = t.innerHTML;
        if(html.length === 0) {
            continue;
        }
        const id = t.getAttribute('data-testid');
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
async function harvestVirtualizedTurns() {
    const cache = new Map();
    const scroller = findVirtualizedScroller();
    if(!scroller) {
        return cache;
    }
    const origScroll = scroller.scrollTop;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    showLoadingOverlay();
    const _ltext = document.querySelector('#gptpdf-loading-overlay .gptpdf-loading-text');
    if(_ltext) _ltext.textContent = 'Loading conversation...';
    const _longWait = setTimeout(function() {
        if(_ltext) _ltext.textContent = 'Loading a long conversation, please wait...';
    }, 7000);
    try {
        scroller.scrollTop = 0;
        await wait(450);
        if(harvestCancelled) {
            await restoreScroll(scroller, origScroll);
            return cache;
        }
        captureRenderedTurns(cache);
        const step = Math.max(
            200, Math.floor(scroller.clientHeight * 0.7));
        const maxIter = 400;
        // Wall-clock guard. With turns unmounting behind us scrollHeight now
        // breathes constantly, so height-stability alone can keep this alive
        // for minutes on a long chat. Bound the wait the user actually stares at.
        const deadline = Date.now() + 90000;
        let stableTries = 0;
        let stuckTries = 0;
        let lastHeight = scroller.scrollHeight;
        for(let i = 0; i < maxIter; i++) {
            if(harvestCancelled || Date.now() > deadline) {
                break;
            }
            const before = scroller.scrollTop;
            const maxScroll =
                scroller.scrollHeight - scroller.clientHeight;
            const next = before + step;
            if(next >= maxScroll) {
                scroller.scrollTop = scroller.scrollHeight;
                await wait(400);
                captureRenderedTurns(cache);
                if(scroller.scrollHeight === lastHeight) {
                    stableTries++;
                    if(stableTries >= 2) {
                        break;
                    }
                } else {
                    stableTries = 0;
                    lastHeight = scroller.scrollHeight;
                }
                continue;
            }
            scroller.scrollTop = next;
            await wait(220);
            captureRenderedTurns(cache);
            // Position refusing to advance means the real bottom, even while
            // scrollHeight keeps shifting under us.
            if(scroller.scrollTop <= before + 2) {
                stuckTries++;
                if(stuckTries >= 4) {
                    break;
                }
            } else {
                stuckTries = 0;
            }
        }
        // Completeness pass: the fixed-delay scroll can miss turns that didn't
        // render in time. Catches only turns still MOUNTED (before 2026-07 that
        // meant every turn, thanks to placeholders; now it means the current
        // window) — scroll each into view and wait for IT to render. Turns that
        // were unmounted behind us are handled by the gap sweep below.
        for(let attempt = 0; attempt < 3 && !harvestCancelled; attempt++) {
            const pending = Array.from(document.querySelectorAll(
                '[data-testid^="conversation-turn"]'
            )).filter(t => {
                const c = cache.get(t.getAttribute('data-testid'));
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
        for(let pass = 0; pass < 2 && !harvestCancelled; pass++) {
            if(Date.now() > deadline || missingTurnIndices(cache).length === 0) {
                break;
            }
            scroller.scrollTop = 0;
            await wait(450);
            captureRenderedTurns(cache);
            const slow = Math.max(
                150, Math.floor(scroller.clientHeight * 0.45));
            for(let i = 0; i < maxIter; i++) {
                if(harvestCancelled || Date.now() > deadline) {
                    break;
                }
                const before = scroller.scrollTop;
                scroller.scrollTop = before + slow;
                await wait(260);
                captureRenderedTurns(cache);
                if(scroller.scrollTop <= before + 2) {
                    break;
                }
            }
        }
        const _idx = Array.from(cache.keys()).map(turnIndex)
            .filter(n => n >= 0);
        console.log('[gptpdf] harvest: ' + cache.size + ' turns' +
            (_idx.length ? ' (' + Math.min.apply(null, _idx) + '→' +
             Math.max.apply(null, _idx) + ')' : '') +
            ', still missing: ' + missingTurnIndices(cache).length);
        await restoreScroll(scroller, origScroll);
    } finally {
        clearTimeout(_longWait);
        hideLoadingOverlay();
    }
    return cache;
}

// Polls until scrollTop sticks — virtualizer may resize scrollHeight
// while restoring, clamping the value until it re-renders.
async function restoreScroll(scroller, origScroll) {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    for(let i = 0; i < 8; i++) {
        scroller.scrollTop = origScroll;
        await wait(120);
        if(scroller.scrollTop === origScroll) {
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
        merged.set(t.getAttribute('data-testid'), {
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
    const ordered = Array.from(merged.keys())
        .sort((a, b) => turnIndex(a) - turnIndex(b));
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
