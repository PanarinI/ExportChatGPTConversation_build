// The figure in the export card (author 17.11: sketch A chosen, v2 approved,
// then his own thought — «он вверх крутит, а вниз он просто читает, а крутится
// само»; mockups in dizajn/animaciya/maket-a-v2.html and maket-a-v3.html).
// 1.2.8 — a character, not a pictogram (author 17.11: «дать ему немножко
// характера, сделать из него милого персонажа», without weighing the build
// down; mockup dizajn/animaciya/maket-b.html): a big head with a face and a
// tuft of hair, round hands and shoes. Each stage has its own face and keeps
// it: puffing at the crank, tongue out while he writes, a wide smile while he
// binds. Between them only small life — he blinks, he breathes, the tuft
// sways when he moves.
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
    const CRANK = { x: 206, y: 56 }, HANDLE = 8;
    const ARM = 22;               // a bendy arm's own length: it sags when slack, stretches to reach
    const SHOW_AFTER_MS = 1200;   // a chat read in a second gets no flicker
    const RESUME_MS = 3000;       // a stage this soon after the last: no delay
    const TURN_S = 1.4;           // one turn of the crank on the way up
    const STEP_S = 0.25;          // the tape's step for one message
    const WALK = 23, WALK_S = 0.8, TAP_S = 0.7;
    const STACK_MAX = 8, STACK_BIND = 5;
    const BLINKS = [3100, 2300, 4200, 2700, 3600];   // ms from one blink to the next, in turn
    // His mouth, drawn facing left from the middle of his head.
    const MOUTH = {
        effort: 'M-5 6.4a.95 1.15 0 1 0 1.9 0a.95 1.15 0 1 0-1.9 0',   // puffing at the crank
        focus: 'M-5.6 6.2Q-4.5 7.1-3.3 6.2',                          // writing, tongue out
        glad: 'M-6.4 5.5Q-4.2 10.4-2 5.5Z'                             // binding his book
    };
    const reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    let host = null, svg = null, el = {};
    let mode = '', count = -1, frozen = false, stoppedAt = 0;
    let theta = 0, tape = 0, tapeTarget = 0, nodT = 1, clock = 0;
    let up = 0, bind = 0;         // how far into "up" and "bind" (eased), the rest is "down"
    let walk = 0, tapClock = 0, cover = 0;
    let blinkAt = BLINKS[0], blinkN = 0, mouth = '';
    let tuft = 0, tuftV = 0, headWas = null, handBehind = null;
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
        el.armB = mk('path', { class: 'a-limb' }, svg);
        el.legL = mk('line', { class: 'a-limb' }, svg);
        el.legR = mk('line', { class: 'a-limb' }, svg);
        el.shoeL = mk('ellipse', { rx: 3.6, ry: 2.1, class: 'a-ink' }, svg);
        el.shoeR = mk('ellipse', { rx: 3.6, ry: 2.1, class: 'a-ink' }, svg);
        el.body = mk('rect', { width: 17, height: 26, rx: 8.5, class: 'a-ink' }, svg);
        // The head, drawn facing left round its own middle; a flip turns it.
        el.head = mk('g', {}, svg);
        mk('circle', { r: 12, class: 'a-face' }, el.head);
        mk('path', { class: 'a-hair',
                     d: 'M-9.6-7.2A12 12 0 0 1 11.6 3.1C10 .6 8.4-2.6 5-3.9C1.6-5.2-2.4-3.9-5.4-5.3C-7.2-6.1-8.2-6.3-9.6-7.2Z' },
           el.head);
        el.tuft = mk('path', { d: 'M2-11.8C1-15.6 5.6-17.6 6.6-14.2', class: 'a-tuft' }, el.head);
        mk('ellipse', { cx: -8.9, cy: 5.7, rx: 2, ry: 1.15, class: 'a-blush' }, el.head);
        mk('ellipse', { cx: 2.1, cy: 5.7, rx: 2, ry: 1.15, class: 'a-blush' }, el.head);
        el.eyes = mk('g', {}, el.head);
        el.eyeA = mk('ellipse', { cx: -7.1, cy: 1.9, rx: 2, ry: 2.65, class: 'a-eyes' }, el.eyes);
        el.eyeB = mk('ellipse', { cx: -1.2, cy: 1.9, rx: 1.85, ry: 2.5, class: 'a-eyes' }, el.eyes);
        el.glint = mk('g', { class: 'a-glint' }, el.eyes);
        mk('circle', { cx: -6.4, cy: .9, r: .8 }, el.glint);
        mk('circle', { cx: -.6, cy: .9, r: .75 }, el.glint);
        el.mouth = mk('path', { class: 'a-mouth' }, el.head);
        el.tongue = mk('ellipse', { cx: -3.1, cy: 7.2, rx: 1.15, ry: .95, class: 'a-tongue', opacity: 0 }, el.head);
        el.armF = mk('path', { class: 'a-limb' }, svg);
        el.pad = mk('rect', { width: 11, height: 13, rx: 1.5, class: 'a-sheet', opacity: 0 }, svg);
        el.pen = mk('line', { class: 'a-pen', opacity: 0 }, svg);
        el.stapler = mk('rect', { width: 9, height: 4, rx: 1, class: 'a-ink', opacity: 0 }, svg);
        el.backHand = mk('circle', { r: 2.5, class: 'a-ink' }, svg);
        el.hand = mk('circle', { r: 2.5, class: 'a-ink' }, svg);
        container.appendChild(svg);
        mouth = '';
        headWas = handBehind = null;
    }

    function set(e, attrs) {
        for(const k in attrs) e.setAttribute(k, attrs[k]);
    }

    // A bendy arm from shoulder S to hand H, a round hand at its end: the
    // closer the hand, the more it bows — forward (side -1) or back (side 1);
    // a side between them bows less, so a change of side never jumps.
    function arm(path, hand, S, H, side) {
        const dx = H.x - S.x, dy = H.y - S.y, d = Math.hypot(dx, dy) || 1;
        const bow = Math.sqrt(Math.max(0, ARM * ARM - d * d)) * 0.9 * Math.abs(side);
        let nx = -dy / d, ny = dx / d;
        if(nx * side < 0) {
            nx = -nx;
            ny = -ny;
        }
        path.setAttribute('d', 'M' + S.x + ' ' + S.y + 'Q' + ((S.x + H.x) / 2 + nx * bow) + ' ' +
                          ((S.y + H.y) / 2 + ny * bow) + ' ' + H.x + ' ' + H.y);
        set(hand, { cx: H.x, cy: H.y });
        return H;
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

    function draw(dt) {
        const read = Math.max(0, 1 - up - bind);
        const K = { x: CRANK.x + HANDLE * Math.cos(theta), y: CRANK.y + HANDLE * Math.sin(theta) };
        set(el.spoke, { x2: K.x, y2: K.y });
        set(el.knob, { cx: K.x, cy: K.y });
        const wx = WALK * ease(walk);
        const lean = Math.cos(theta) * 2 * up;          // into the crank as it swings away
        const stride = walk > 0 && walk < 1 ? Math.sin(walk * Math.PI * 4) : 0;
        const breath = Math.sin(clock / 1300 * Math.PI) * 0.5 * (1 - up);
        const bob = -Math.abs(stride) * 1.2;
        const y0 = bob + breath;
        const S = { x: 224 + lean + wx, y: 71 + y0 }, SB = { x: 235.5 + lean * 0.6 + wx, y: 71.5 + y0 };
        const pad = { x: 216.5, y: 81 };
        const top = 99 - (Math.max(stackN, 1) - 1) * 5;
        // Front hand: the crank going up, the notepad's corner going down, by the side binding.
        arm(el.armF, el.hand, S, {
            x: K.x * up + (pad.x - 4) * read + (S.x + 1) * bind,
            y: K.y * up + (pad.y + 5.5) * read + (S.y + 19) * bind
        }, 2 * read - 1);
        // Back hand: hangs going up, writes going down, staples binding — at the
        // book's spine. Behind him while it hangs, in front while it works.
        const write = Math.sin(clock / 90) * 1.6 * read;
        const ph = (tapClock % TAP_S) / TAP_S;
        const tap = ph < 0.25 ? ph / 0.25 : Math.max(0, 1 - (ph - 0.25) / 0.45);
        // While he walks over he carries the stapler at his chest; there, he reaches the book.
        const reach = ease(walk);
        const staple = { x: SB.x + 7 + (275 - SB.x - 7) * reach,
                         y: SB.y + 10 + (top - 15 + 8 * tap - SB.y - 10) * reach };
        const HB = arm(el.armB, el.backHand, SB, {
            x: (SB.x + 2) * up + (219.5 + write) * read + staple.x * bind,
            y: (SB.y + 19) * up + (79 + Math.cos(clock / 70) * 1.2) * read + staple.y * bind
        }, 1);
        if((up > 0.5) !== handBehind) {
            handBehind = up > 0.5;
            svg.insertBefore(el.backHand, handBehind ? el.body : el.hand);
        }
        set(el.stapler, { x: HB.x - 4.5, y: HB.y - 1, opacity: bind });
        set(el.pad, { x: pad.x - 5.5, y: pad.y - 6.5, opacity: read });
        set(el.pen, { x1: HB.x, y1: HB.y, x2: HB.x - 3, y2: HB.y - 5, opacity: read });
        // Legs step while he walks over; the shoes point where he faces.
        const face = bind > 0.5 ? -1 : 1;
        const gait = stride * 3;
        const hip = 90 + bob, foot = 101;
        set(el.legL, { x1: 228 + wx, y1: hip, x2: 226 + wx + gait, y2: foot });
        set(el.legR, { x1: 234 + wx, y1: hip, x2: 236 + wx - gait, y2: foot });
        set(el.shoeL, { cx: 226 + wx + gait - 1.3 * face, cy: foot + 1.2 });
        set(el.shoeR, { cx: 236 + wx - gait - 1.3 * face, cy: foot + 1.2 });
        set(el.body, { x: 221.5 + lean * 0.6 + wx, y: 67 + y0 });
        const nod = read * Math.max(0, Math.sin(nodT * Math.PI)) * 1.2;
        const hx = 230 + lean + wx, hy = 54 + y0 + nod;
        el.head.setAttribute('transform', 'translate(' + hx + ',' + hy + ') scale(' + face + ',1)');
        // His face: where he looks, his blinks, his mouth for the stage.
        el.eyes.setAttribute('transform', 'translate(' + (-0.6 * up - 0.3 * read - 0.3 * bind) + ',' +
                             (0.8 * read + 0.3 * bind) + ')');
        const open = clock >= blinkAt ? 0.12 : 1;
        set(el.eyeA, { ry: 2.65 * open });
        set(el.eyeB, { ry: 2.5 * open });
        set(el.glint, { opacity: open > 0.5 ? 1 : 0 });
        const m = bind > 0.5 ? 'glad' : up > 0.5 ? 'effort' : 'focus';
        if(m !== mouth) {
            mouth = m;
            set(el.mouth, { d: MOUTH[m], class: m === 'focus' ? 'a-mouth' : 'a-mouth open' });
        }
        set(el.tongue, { opacity: m === 'focus' ? 1 : 0, cx: -3.1 + Math.sin(clock / 90) * 0.3 });
        // The tuft lags behind his head and springs back.
        if(dt > 0) {
            if(headWas) {
                const vx = (hx - headWas.x) / dt * face, vy = (hy - headWas.y) / dt;
                const want = Math.max(-28, Math.min(28, -vx * 0.9 + vy * 0.5));
                tuftV += (170 * (want - tuft) - 9 * tuftV) * dt;
                tuft += tuftV * dt;
            }
            headWas = { x: hx, y: hy };
        }
        el.tuft.setAttribute('transform', 'rotate(' + tuft + ' 2 -11.8)');
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
        if(clock >= blinkAt + 140) blinkAt = clock + BLINKS[++blinkN % BLINKS.length];
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
            const px = 211, py = 74;
            set(el.fly, { x: px + (270 - px) * t,
                          y: py + (99 - flight.to * 5 - py) * t - 5 * Math.sin(Math.PI * t),
                          opacity: t < 0.95 ? 1 : 0 });
            if(t >= 1) {
                flight = null;
                addSheet();
            }
        }
        draw(dt);
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
            draw(0);
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
                     cover: Math.round(cover * 100) / 100, mouth: mouth };
        }
    };
})();
