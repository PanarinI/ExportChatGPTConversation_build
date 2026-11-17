// The figure in the export card (author 17.11: sketch A chosen, v2 approved,
// then his own thought — «он вверх крутит, а вниз он просто читает, а крутится
// само»; mockups in dizajn/animaciya/maket-a-v2.html and maket-a-v3.html).
//
// The chat's messages pass through a "screen" — outlines outside it, drawn
// inside. One state per stage, none that change on their own (author 17.11:
// "2 состояния наверх и вниз"; poses that came and went — waiting, pictures —
// "скорее больше раздражало"):
//   up   ("Loading conversation…", "Loading older messages… N parts") — he
//        turns a crank: ChatGPT has to be made to hand over the older parts;
//        the tape runs down, the older messages come from above;
//   down ("Reading X of Y", "Filling in N") — the tape steps by itself, one
//        step per message; he nods to each and writes into a notepad, the
//        sheet goes to the stack. While pictures load he keeps writing;
//   bind ("Preparing the PDF…", "Adding images…", "Compressing images…",
//        "Creating the PDF…") — he steps over to his stack and staples it into
//        a book with "PDF" on the cover, until the file comes (1.2.7, author:
//        «пропадает наш герой и оставляет нас. Нехорошо» — the server's wait
//        is the longest one).
// "Paused" (a hidden tab) holds the scene still. The card's text colour draws
// it, so it follows the card's light and dark. Driven from capture.js:
// setHarvestProgress() hands its line here (fromText), hideLoadingOverlay()
// ends it — and the next stage's line picks it up again without a blink.
const gptpdfAnim = (function() {
    const NS = 'http://www.w3.org/2000/svg';
    const WIDTHS = [46, 40, 52, 36, 44, 48, 42];
    const CRANK = { x: 206, y: 56 }, HANDLE = 8, UPPER = 15, FORE = 15;
    const SHOW_AFTER_MS = 1200;   // a chat read in a second gets no flicker
    const RESUME_MS = 3000;       // a stage this soon after the last: no delay
    const TURN_S = 1.4;           // one turn of the crank on the way up
    const STEP_S = 0.25;          // the tape's step for one message
    const WALK = 26, WALK_S = 0.8, TAP_S = 0.7;
    const STACK_MAX = 9, STACK_BIND = 5;
    const reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    let host = null, svg = null, el = {};
    let mode = '', count = -1, frozen = false, stoppedAt = 0;
    let theta = 0, tape = 0, tapeTarget = 0, nodT = 1, clock = 0;
    let up = 0, bind = 0;         // how far into "up" and "bind" (eased), the rest is "down"
    let walk = 0, tapClock = 0, cover = 0;
    let last = null, raf = 0, flight = null, stackN = 0, showTimer = null;
    let manual = false;           // stands and tests drive time themselves

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
        el.knob = mk('circle', { r: 2.6, class: 'a-ink' }, svg);
        el.stack = mk('g', {}, svg);
        // The book the stack becomes: a cover and its title.
        el.cover = mk('rect', { x: 265, rx: 2.5, width: 40, class: 'a-cover', opacity: 0 }, svg);
        el.title = mk('text', { x: 285, class: 'a-title', 'text-anchor': 'middle', opacity: 0 }, svg);
        el.title.textContent = 'PDF';
        el.fly = mk('rect', { width: 14, height: 7, rx: 2, class: 'a-sheet', opacity: 0 }, svg);
        el.backUpper = mk('line', { class: 'a-limb' }, svg);
        el.backFore = mk('line', { class: 'a-limb' }, svg);
        el.legL = mk('line', { class: 'a-limb' }, svg);
        el.legR = mk('line', { class: 'a-limb' }, svg);
        el.body = mk('rect', { y: 58, width: 14, height: 30, rx: 7, class: 'a-ink' }, svg);
        el.head = mk('circle', { r: 7.5, class: 'a-ink' }, svg);
        el.eye = mk('circle', { r: 1.4, class: 'a-eye' }, svg);
        el.pad = mk('rect', { width: 11, height: 13, rx: 1.5, class: 'a-sheet', opacity: 0 }, svg);
        el.pen = mk('line', { class: 'a-pen', opacity: 0 }, svg);
        el.stapler = mk('rect', { width: 9, height: 4, rx: 1, class: 'a-ink', opacity: 0 }, svg);
        el.upper = mk('line', { class: 'a-limb' }, svg);
        el.fore = mk('line', { class: 'a-limb' }, svg);
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

    function arm(upper, fore, S, H) {
        const E = elbow(S, H);
        set(upper, { x1: S.x, y1: S.y, x2: E.x, y2: E.y });
        set(fore, { x1: E.x, y1: E.y, x2: H.x, y2: H.y });
    }

    function addSheet() {
        if(stackN >= STACK_MAX) return;
        mk('rect', { x: 270 + (stackN % 2 ? 1 : -1), y: 99 - stackN * 5,
                     width: 30, height: 4, rx: 1, class: 'a-sheet' }, el.stack);
        stackN++;
    }

    function ease(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function draw() {
        const read = Math.max(0, 1 - up - bind);
        const K = { x: CRANK.x + HANDLE * Math.cos(theta), y: CRANK.y + HANDLE * Math.sin(theta) };
        set(el.spoke, { x2: K.x, y2: K.y });
        set(el.knob, { cx: K.x, cy: K.y });
        const wx = WALK * ease(walk);
        const lean = -Math.cos(theta) * 1.6 * up;
        const S = { x: 224 + lean + wx, y: 62 }, SB = { x: 234 + lean * 0.6 + wx, y: 63 };
        const pad = { x: 218, y: 73 };
        const top = 99 - (Math.max(stackN, 1) - 1) * 5;
        // Front hand: the crank going up, the notepad going down, by the side binding.
        const rest = { x: S.x - 3, y: S.y + 24 };
        arm(el.upper, el.fore, S, {
            x: K.x * up + pad.x * read + rest.x * bind,
            y: K.y * up + pad.y * read + rest.y * bind
        });
        // Back hand: hangs going up, writes going down, staples binding.
        const write = Math.sin(clock / 90) * 1.6 * read;
        const ph = (tapClock % TAP_S) / TAP_S;
        const tap = ph < 0.25 ? ph / 0.25 : Math.max(0, 1 - (ph - 0.25) / 0.45);
        const staple = { x: 283, y: top - 13 + 9 * tap };
        const HB = {
            x: 236 * up + (222 + write) * read + staple.x * bind,
            y: 80 * up + (71 + Math.cos(clock / 70) * 1.2) * read + staple.y * bind
        };
        arm(el.backUpper, el.backFore, SB, HB);
        set(el.stapler, { x: HB.x - 2, y: HB.y - 2, opacity: bind });
        set(el.pad, { x: pad.x - 6, y: pad.y - 7, opacity: read });
        set(el.pen, { x1: HB.x, y1: HB.y, x2: HB.x - 3, y2: HB.y - 5, opacity: read });
        // Legs step while he walks over.
        const gait = walk > 0 && walk < 1 ? Math.sin(walk * Math.PI * 4) * 3 : 0;
        set(el.legL, { x1: 229 + wx, y1: 86, x2: 226 + wx + gait, y2: 104 });
        set(el.legR, { x1: 235 + wx, y1: 86, x2: 238 + wx - gait, y2: 104 });
        const nod = read * Math.max(0, Math.sin(nodT * Math.PI)) * 1.2;
        set(el.body, { x: 223 + lean * 0.6 + wx });
        set(el.head, { cx: 230 + lean + wx, cy: 48 + nod });
        set(el.eye, { cx: 227 + lean + wx + 6 * bind, cy: 47 + nod });
        // The cover closes round the stack as the staples go in.
        set(el.cover, { y: top - 4, height: 103 - top + 4 + 2, opacity: cover * bind });
        set(el.title, { y: (top - 4 + 105) / 2 + 3.5, opacity: cover * bind });
        const shift = 'translate(0,' + (-(((tape % 112) + 112) % 112)) + ')';
        el.tapeOut.setAttribute('transform', shift);
        el.tapeIn.setAttribute('transform', shift);
    }

    // One step of the scene, dt seconds long. "Paused" holds it still.
    function advance(dt) {
        if(frozen) return;
        clock += dt * 1000;
        const k = Math.min(1, dt * 5);
        up += ((mode === 'loading' ? 1 : 0) - up) * k;
        bind += ((mode === 'binding' ? 1 : 0) - bind) * k;
        if(mode === 'loading') {
            theta -= dt * 2 * Math.PI / TURN_S;
            tape -= dt * 16 / TURN_S;
            tapeTarget = tape;
        } else if(tape < tapeTarget) {
            tape = Math.min(tapeTarget, tape + dt * 16 / STEP_S);
        }
        if(mode === 'binding') {
            if(walk < 1) {
                walk = Math.min(1, walk + dt / WALK_S);
            } else {
                const before = Math.floor(tapClock / TAP_S);
                tapClock += dt;
                if(Math.floor(tapClock / TAP_S) > before) cover = Math.min(1, cover + 0.25);
            }
        }
        nodT = Math.min(1, nodT + dt / 0.75);
        if(flight) {
            flight.t += dt / 0.6;
            const t = Math.min(1, flight.t);
            const px = 212, py = 66;
            set(el.fly, { x: px + (270 - px) * t,
                          y: py + (99 - flight.to * 5 - py) * t - 5 * Math.sin(Math.PI * t),
                          opacity: t < 0.95 ? 1 : 0 });
            if(t >= 1) {
                flight = null;
                addSheet();
            }
        }
        draw();
    }

    function frame(ts) {
        raf = 0;
        if(!mode || !svg) return;
        if(last === null) last = ts;
        const dt = Math.min(0.05, (ts - last) / 1000);
        last = ts;
        advance(dt);
        raf = requestAnimationFrame(frame);
    }

    function kick() {
        if(!svg) return;
        if(reduced) {
            up = mode === 'loading' ? 1 : 0;
            bind = mode === 'binding' ? 1 : 0;
            walk = cover = bind;
            draw();
        } else if(!raf && !manual) {
            last = null;
            raf = requestAnimationFrame(frame);
        }
    }

    function show() {
        showTimer = null;
        if(mode && host) host.classList.add('on');
    }

    // mode: 'loading' (up) | 'reading' (down) | 'binding'; n: the count shown.
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
        frozen = false;
        if(newMode !== mode) {
            const wasOn = !!mode;
            mode = newMode;
            count = -1;
            flight = null;
            if(newMode === 'reading') {
                el.stack.textContent = '';
                stackN = 0;
                tapeTarget = tape;
            }
            if(newMode === 'binding') {
                while(stackN < STACK_BIND) addSheet();   // a short chat has no stack yet
            } else {
                walk = tapClock = cover = 0;
            }
            // The scrolling hides the card for a moment before the next stage:
            // no fresh delay then, the scene just goes on.
            if(!wasOn && !showTimer) {
                if(Date.now() - stoppedAt < RESUME_MS) show();
                else showTimer = setTimeout(show, SHOW_AFTER_MS);
            }
        }
        if(typeof n === 'number' && n !== count) {
            if(count >= 0 && mode === 'reading') {   // "Filling in" counts down
                tapeTarget = Math.max(tapeTarget, tape) + 16;
                nodT = 0;
                if(reduced) addSheet();
                else if(!flight) flight = { t: 0, to: Math.min(stackN, STACK_MAX - 1) };
            }
            count = n;
        }
        kick();
    }

    function stop() {
        if(mode) stoppedAt = Date.now();
        mode = '';
        count = -1;
        flight = null;
        frozen = false;
        clearTimeout(showTimer);
        showTimer = null;
        if(raf) cancelAnimationFrame(raf);
        raf = 0;
        if(host) host.classList.remove('on');
    }

    // Dev builds: "#gptpdf-noanim" in the page address turns the scene off —
    // to export the same chat with and without it and compare (17.11).
    function off() {
        return typeof gptpdfShared !== 'undefined' && /-dev/.test(gptpdfShared.build || '') &&
            /gptpdf-noanim/.test(location.hash || '');
    }

    // The card's own line says which stage this is (capture.js): up —
    // "Loading conversation… 40", "Loading older messages… 3 parts"; down —
    // "Reading 120 of 257", "Reading 12 messages…", "Filling in 5…"; binding —
    // "Preparing the PDF…", "Adding images… 3 of 12", "Compressing images…",
    // "Creating the PDF from 40 messages…"; a hidden tab — "Paused: …", when
    // the scene holds still. Any other line ends it.
    function fromText(text) {
        if(off()) {
            stop();
            return;
        }
        const m = /^(Loading conversation|Loading older messages|Reading|Filling in|Paused|Preparing the PDF|Adding images|Compressing images|Creating the PDF)\D*(\d+)?/
            .exec(String(text || ''));
        if(!m) {
            stop();
            return;
        }
        if(m[1] === 'Paused') {
            if(mode) frozen = true;
            return;
        }
        const which = (m[1] === 'Reading' || m[1] === 'Filling in') ? 'reading'
            : /^Loading/.test(m[1]) ? 'loading' : 'binding';
        step(which, which === 'binding' ? undefined : (m[2] ? parseInt(m[2], 10) : undefined));
    }

    return {
        fromText: fromText,
        stop: stop,
        _off: off,
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
            advance(Math.min(0.05, ms / 1000));
        },
        _state: function() {
            return { mode: mode, count: count, on: !!(host && host.classList.contains('on')),
                     pose: bind > 0.5 ? 'bind' : up > 0.5 ? 'up' : 'down', frozen: frozen,
                     sheets: stackN, flying: !!flight, crank: Math.round(theta * 100) / 100,
                     tape: Math.round(tape), walk: Math.round(walk * 100) / 100,
                     cover: Math.round(cover * 100) / 100 };
        }
    };
})();
