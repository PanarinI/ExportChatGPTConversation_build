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

function hasUnrenderedTurns() {
    const turns = document.querySelectorAll(
        '[data-testid^="conversation-turn"]');
    for(let i = 0; i < turns.length; i++) {
        if(turns[i].innerHTML.length === 0) {
            return true;
        }
    }
    return false;
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
        const prev = cache.get(id);
        if(!prev || html.length > prev.length) {
            cache.set(id, t.outerHTML);
        }
    }
}

let harvestCancelled = false;

function requestHarvestCancel() {
    harvestCancelled = true;
}

function showLoadingOverlay() {
    harvestCancelled = false;
    const ov = document.getElementById('pdfcrowd-loading-overlay');
    if(!ov) {
        return;
    }
    ov.classList.toggle('pdfcrowd-dark', !isLight(document.body));
    ov.style.display = 'flex';
}

function hideLoadingOverlay() {
    const ov = document.getElementById('pdfcrowd-loading-overlay');
    if(ov) {
        ov.style.display = 'none';
    }
}

// Scrolls the chat top→bottom, caching each turn's HTML as it renders.
// ChatGPT's virtualizer keeps placeholder nodes with empty innerHTML for
// off-screen turns; this pass forces them all to render.
async function harvestVirtualizedTurns() {
    const cache = new Map();
    if(!hasUnrenderedTurns()) {
        return cache;
    }
    const scroller = findVirtualizedScroller();
    if(!scroller) {
        return cache;
    }
    const origScroll = scroller.scrollTop;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    showLoadingOverlay();
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
        let stableTries = 0;
        let lastHeight = scroller.scrollHeight;
        for(let i = 0; i < maxIter; i++) {
            if(harvestCancelled) {
                break;
            }
            const maxScroll =
                scroller.scrollHeight - scroller.clientHeight;
            const next = scroller.scrollTop + step;
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
        }
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
    for(let i = 0; i < 8; i++) {
        scroller.scrollTop = origScroll;
        await wait(120);
        if(scroller.scrollTop === origScroll) {
            return;
        }
    }
}

function restoreVirtualizedTurns(clone, cache) {
    if(!cache || cache.size === 0) {
        return;
    }
    const turns = clone.querySelectorAll(
        '[data-testid^="conversation-turn"]');
    turns.forEach(t => {
        if(t.innerHTML.length > 0) {
            return;
        }
        const id = t.getAttribute('data-testid');
        const cached = cache.get(id);
        if(cached) {
            t.outerHTML = cached;
        }
    });
}

// ─────────────────────────────────────────────────────────────────────
// Rate Us state
let pcrRateUsMode = false;
let pcrDropdownOpen = false;
// ─────────────────────────────────────────────────────────────────────
