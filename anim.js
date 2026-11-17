// The figure in the export card while the chat is read (author 17.11, chosen
// from two sketches; mockup dizajn/animaciya/maket-a-v2.html).
//
// A small figure turns a crank; the chat's messages pass through a "screen" —
// outlines outside it, drawn inside — and each message read flies to a stack
// as a copy. It shows what the step does (ChatGPT shows only the messages that
// fit on the screen, so the export scrolls and copies each one), and it is
// honest: it moves only while the real count grows. When the count stops — a
// hidden tab, ChatGPT still fetching an older part — the figure lets go of the
// crank, turns to the reader and waits. The climb to the start of the chat
// ("Loading conversation") turns the crank the other way, without copies.
//
// Driven from capture.js: setHarvestProgress() hands its line here
// (gptpdfAnim.fromText) and hideLoadingOverlay() ends it. The drawing lives in
// the card's .gptpdf-anim slot (templates.js), coloured by the card's text
// colour, so it follows the card's light and dark.
const gptpdfAnim = (function() {
    const NS = 'http://www.w3.org/2000/svg';
    const WIDTHS = [46, 40, 52, 36, 44, 48, 42];
    const CRANK = { x: 206, y: 56 }, HANDLE = 8, UPPER = 15, FORE = 15;
    const STALL_MS = 2500;       // no new message for this long: the figure waits
    const SHOW_AFTER_MS = 1200;  // a chat read in a second gets no flicker
    const TURN_S = 1.4;          // one turn of the crank = one message through
    const STACK_MAX = 9;
    const reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    let host = null, svg = null, el = {};
    let mode = '', count = -1, lastProgress = 0, theta = 0, last = null;
    let rest = 0, raf = 0, flight = null, stackN = 0, showTimer = null;
    let manual = false, manualTs = 0;   // stands and tests drive time themselves

    function mk(tag, attrs, parent) {
        const e = document.createElementNS(NS, tag);
        for(const k in attrs) e.setAttribute(k, attrs[k]);
        if(parent) parent.appendChild(e);
        return e;
    }

    function build(container) {
        el = {};
        svg = mk('svg', { viewBox: '0 0 320 110', 'aria-hidden': 'true', focusable: 'false' });
        const clip = mk('clipPath', { id: 'gptpdf-anim-win' }, mk('defs', {}, svg));
        mk('rect', { x: 104, y: 14, width: 86, height: 84, rx: 6 }, clip);
        el.tapeOut = mk('g', { class: 'a-out' }, svg);
        el.tapeIn = mk('g', { class: 'a-in' }, mk('g', { 'clip-path': 'url(#gptpdf-anim-win)' }, svg));
        [el.tapeOut, el.tapeIn].forEach(function(g) {
            for(let i = 0; i < 14; i++) {
                const w = WIDTHS[i % 7];
                mk('rect', { x: i % 2 === 0 ? 112 : 182 - w, y: 2 + i * 16,
                             width: w, height: 10, rx: 5 }, g);
            }
        });
        mk('rect', { x: 104, y: 14, width: 86, height: 84, rx: 6, class: 'a-frame' }, svg);
        mk('circle', { cx: CRANK.x, cy: CRANK.y, r: 9, class: 'a-frame' }, svg);
        el.spoke = mk('line', { x1: CRANK.x, y1: CRANK.y, class: 'a-thin' }, svg);
        mk('line', { x1: 190, y1: 56, x2: 197, y2: 56, class: 'a-thin' }, svg);
        el.stack = mk('g', {}, svg);
        el.fly = mk('rect', { width: 16, height: 7, rx: 3.5, class: 'a-fly', opacity: 0 }, svg);
        el.armBack = mk('line', { class: 'a-limb' }, svg);
        mk('line', { x1: 229, y1: 86, x2: 226, y2: 104, class: 'a-limb' }, svg);
        mk('line', { x1: 235, y1: 86, x2: 238, y2: 104, class: 'a-limb' }, svg);
        el.body = mk('rect', { y: 58, width: 14, height: 30, rx: 7, class: 'a-ink' }, svg);
        el.head = mk('circle', { cy: 48, r: 7.5, class: 'a-ink' }, svg);
        el.eye = mk('circle', { class: 'a-eye' }, svg);
        el.upper = mk('line', { class: 'a-limb' }, svg);
        el.fore = mk('line', { class: 'a-limb' }, svg);
        el.knob = mk('circle', { r: 2.6, class: 'a-ink' }, svg);
        el.dots = mk('text', { x: 238, y: 34, class: 'a-dots', opacity: 0 }, svg);
        el.dots.textContent = '…';
        container.appendChild(svg);
    }

    function set(e, attrs) {
        for(const k in attrs) e.setAttribute(k, attrs[k]);
    }

    // Two-part arm from shoulder S to hand H: the elbow that hangs lower.
    function elbow(S, H) {
        const d = Math.min(Math.max(Math.hypot(H.x - S.x, H.y - S.y), 1), UPPER + FORE - 0.01);
        const a = Math.atan2(H.y - S.y, H.x - S.x);
        const b = Math.acos((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d));
        const e1 = { x: S.x + UPPER * Math.cos(a + b), y: S.y + UPPER * Math.sin(a + b) };
        const e2 = { x: S.x + UPPER * Math.cos(a - b), y: S.y + UPPER * Math.sin(a - b) };
        return e1.y > e2.y ? e1 : e2;
    }

    function addSheet() {
        if(stackN >= STACK_MAX) return;
        mk('rect', { x: 270 + (stackN % 2 ? 1 : -1), y: 99 - stackN * 5,
                     width: 30, height: 4, rx: 1, class: 'a-sheet' }, el.stack);
        stackN++;
    }

    function draw(ts) {
        const K = { x: CRANK.x + HANDLE * Math.cos(theta), y: CRANK.y + HANDLE * Math.sin(theta) };
        set(el.spoke, { x2: K.x, y2: K.y });
        set(el.knob, { cx: K.x, cy: K.y });
        const lean = -Math.cos(theta) * 1.6 * (1 - rest);
        const S = { x: 224 + lean, y: 62 };
        const H = { x: K.x + (S.x - 4 - K.x) * rest, y: K.y + (S.y + 24 - K.y) * rest };
        const E = elbow(S, H);
        set(el.upper, { x1: S.x, y1: S.y, x2: E.x, y2: E.y });
        set(el.fore, { x1: E.x, y1: E.y, x2: H.x, y2: H.y });
        set(el.body, { x: 223 + lean * 0.6 });
        set(el.head, { cx: 230 + lean });
        const blink = rest > 0.5 && Math.floor(ts / 1600) % 3 === 0;
        set(el.eye, { cx: 230 + lean - 3 * (1 - rest), cy: 47 + rest * 0.5, r: blink ? 0.4 : 1.4 });
        set(el.armBack, { x1: 234 + lean * 0.6, y1: 63, x2: 236 + Math.sin(theta) * 3 * (1 - rest), y2: 80 });
        el.dots.setAttribute('opacity', rest > 0.6 ? 1 : 0);
        const off = (theta / (2 * Math.PI)) * 16;
        const shift = 'translate(0,' + (-(((off % 112) + 112) % 112)) + ')';
        el.tapeOut.setAttribute('transform', shift);
        el.tapeIn.setAttribute('transform', shift);
    }

    function frame(ts) {
        raf = 0;
        if(!mode || !svg) return;
        if(last === null) last = ts;
        const dt = Math.min(0.05, (ts - last) / 1000);
        last = ts;
        advance(dt, ts);
        raf = requestAnimationFrame(frame);
    }

    // One step of the scene, dt seconds long.
    function advance(dt, ts) {
        const waiting = Date.now() - lastProgress > STALL_MS;
        rest += ((waiting ? 1 : 0) - rest) * Math.min(1, dt * 4);
        if(!waiting) theta += (mode === 'loading' ? -1 : 1) * dt * 2 * Math.PI / TURN_S;
        if(flight) {
            flight.t += dt / 0.7;
            const t = Math.min(1, flight.t);
            set(el.fly, { x: 182 + (271 - 182) * t,
                          y: 12 + (99 - flight.to * 5 - 12) * t - 20 * Math.sin(Math.PI * t),
                          opacity: t < 0.95 ? 1 : 0 });
            if(t >= 1) {
                flight = null;
                addSheet();
            }
        }
        draw(ts);
    }

    function show() {
        showTimer = null;
        if(mode && host) host.classList.add('on');
    }

    // mode: 'loading' | 'reading'; n: the count the card shows, if any.
    function step(newMode, n) {
        const card = document.getElementById('gptpdf-progress');
        const slot = card && card.querySelector('.gptpdf-anim');
        if(!slot) return;
        if(slot !== host || !svg || !slot.contains(svg)) {
            host = slot;
            host.textContent = '';
            build(host);
            stackN = 0;
        }
        if(newMode !== mode) {
            const wasOn = !!mode;
            mode = newMode;
            count = -1;
            flight = null;
            lastProgress = Date.now();
            if(newMode === 'reading') {
                el.stack.textContent = '';
                stackN = 0;
            }
            if(!wasOn && !showTimer) showTimer = setTimeout(show, SHOW_AFTER_MS);
        }
        if(typeof n === 'number' && n !== count) {
            if(count >= 0 && mode === 'reading') {   // "Filling in" counts down
                if(reduced) addSheet();
                else if(!flight) flight = { t: 0, to: Math.min(stackN, STACK_MAX - 1) };
            }
            count = n;
            lastProgress = Date.now();
        }
        if(reduced) {
            draw(0);            // still picture, the stack still grows
        } else if(!raf && !manual) {
            last = null;
            raf = requestAnimationFrame(frame);
        }
    }

    function stop() {
        mode = '';
        count = -1;
        flight = null;
        clearTimeout(showTimer);
        showTimer = null;
        if(raf) cancelAnimationFrame(raf);
        raf = 0;
        if(host) host.classList.remove('on');
    }

    // The card's own line says which step this is (capture.js): the climb —
    // "Loading conversation… 40", "Loading older messages… 3 parts"; the walk —
    // "Reading 120 of 257", "Reading 12 messages…", "Filling in 5…"; a hidden
    // tab — "Paused: …", when the figure stays and waits. Any other line
    // (pictures, the PDF) ends the scene.
    function fromText(text) {
        const m = /^(Loading conversation|Loading older messages|Reading|Filling in|Paused)\D*(\d+)?/
            .exec(String(text || ''));
        if(!m) {
            stop();
            return;
        }
        if(m[1] === 'Paused') {
            lastProgress = 0;        // nothing moves until the tab is back
            return;
        }
        const walk = m[1] === 'Reading' || m[1] === 'Filling in';
        step(walk ? 'reading' : 'loading', m[2] ? parseInt(m[2], 10) : undefined);
    }

    return {
        fromText: fromText,
        stop: stop,
        // Stands and tests: time by hand (a hidden or headless page draws no
        // frames, and virtual time does not move frame timestamps).
        _manual: function(on) {
            manual = !!on;
            if(manual && raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
        },
        _tick: function(ms) {
            if(!mode || !svg || reduced) return;
            manualTs += ms;
            advance(Math.min(0.05, ms / 1000), manualTs);
        },
        _state: function() {
            return { mode: mode, count: count, on: !!(host && host.classList.contains('on')),
                     waiting: Date.now() - lastProgress > STALL_MS, sheets: stackN, flying: !!flight,
                     rest: Math.round(rest * 100) / 100 };
        }
    };
})();
