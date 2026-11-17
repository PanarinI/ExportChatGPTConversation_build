'use strict';

// A dark ChatGPT page, for every dark rule below. The old page put class
// "dark" on <html>; the new one (10-2026) sets data-theme="dark" instead and
// has no such class — measured on the author's account 18.10, where our menu
// stayed light on a black page. Either marker turns our dark styles on.
const GPTPDF_DARK = ':is(html.dark, html[data-theme="dark"])';

// In-page UI styles (Export button, dropdown, settings modal, block-selection).
// Static CSS, extracted verbatim from common.js.
const UI_CSS = `
 .gptpdf-block {
     position: fixed;
     height: 36px;
     top: 10px;
     right: 180px;
 }

 /* ── Welcome-hint ripple rings ───────────────────────────── */
 @keyframes gptpdfRing {
     0%   { transform: scale(0.88); opacity: 0; }
     15%  { opacity: 1; }
     100% { transform: scale(1.6);  opacity: 0; }
 }
 .gptpdf-ring {
     position: absolute;
     inset: -10px;
     border-radius: 14px;
     border: 2px solid rgba(234,76,58,0.35);
     animation: gptpdfRing 2.8s ease-out infinite;
     pointer-events: none;
 }
 .gptpdf-ring:nth-child(2) { animation-delay: 0.9s; }
 .gptpdf-ring:nth-child(3) { animation-delay: 1.8s; }

 /* ── No-chat (home page) state ───────────────────────────── */
 .gptpdf-no-chat {
     opacity: 0.45;
     cursor: default;
 }
 .gptpdf-no-chat:hover {
     opacity: 0.55;
 }
 .gptpdf-no-chat-tooltip {
     position: absolute;
     top: calc(100% + 10px);
     right: 0;
     background: rgba(30,30,30,0.94);
     color: #fff;
     font-size: 13px;
     line-height: 1.4;
     padding: 9px 14px;
     border-radius: 10px;
     white-space: nowrap;
     pointer-events: none;
     opacity: 0;
     transition: opacity 0.2s;
     z-index: 100001;
 }
 ${GPTPDF_DARK} .gptpdf-no-chat-tooltip {
     background: rgba(60,60,60,0.96);
 }
 .gptpdf-no-chat-tooltip.gptpdf-tooltip-visible {
     opacity: 1;
 }

 @media (max-width: 767px) {
     .gptpdf-lg {
         display: none;
     }

     .gptpdf-sm {
         display: block;
     }
 }

 .gptpdf-lg {
     display: block;
 }

 .gptpdf-sm {
     display: none;
 }

 .gptpdf-btn-smaller .gptpdf-lg {
     display: none;
 }

 .gptpdf-btn-smaller .gptpdf-sm {
     display: block;
 }

 .gptpdf-btn-smallest .gptpdf-lg, .gptpdf-btn-smallest .gptpdf-sm {
     display: none;
 }

 .gptpdf-btn-xs-small .gptpdf-lg, .gptpdf-btn-xs-small .gptpdf-sm {
     display: none;
 }

 .gptpdf-btn-xs-small .btn-small {
     background: none;
     border: none;
 }

 .gptpdf-btn-xs-small svg {
     margin: 0;
 }

 svg.gptpdf-btn-content {

     width: 1rem;
     height: 1rem;
 }

 #gptpdf-convert-main svg {
color: #EA4C3A;
}

 /* Our own row: "Export" and the arrow side by side. Until 1.2.3 the row came
    from ChatGPT's .btn class; the new page (10-2026) dropped it, and the arrow
    fell under the button (author's screenshot 18.10). */
 #gptpdf-convert-main {
     display: inline-flex;
     align-items: center;
     white-space: nowrap;
     padding: 0;
     border-radius: 12px;
    background: transparent;
    border: none;
 }

#gptpdf-btn-left {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 0.5rem;
    border-radius: 10px 0 0 10px;
    transition: background 0.15s ease;
}

#gptpdf-convert-main:hover #gptpdf-btn-left,
#gptpdf-convert-main:hover #gptpdf-more {
    background: rgba(0,0,0,0.06);
}

${GPTPDF_DARK} #gptpdf-convert-main:hover #gptpdf-btn-left,
${GPTPDF_DARK} #gptpdf-convert-main:hover #gptpdf-more {
    background: rgba(255,255,255,0.1);
}

 #gptpdf-convert-main:disabled {
     cursor: wait;
     filter: none;
     opacity: 1;
 }

 .gptpdf-dropdown-arrow::after {
     display: inline-block;
     width: 0;
     height: 0;
     vertical-align: .255em;
     content: "";
     border-top: .3em solid;
     border-right: .3em solid transparent;
     border-bottom: 0;
     border-left: .3em solid transparent;
     opacity: 0.45;
    transition: opacity 0.15s ease;
 }

#gptpdf-convert-main:hover
.gptpdf-dropdown-arrow::after {
    opacity: 0.9;
}
 .gptpdf-fs-small {
     font-size: 14px;
     line-height: 1.25rem;
 }

 #gptpdf-more {
     cursor: pointer;
     padding: .5rem;
     border-top-right-radius: 10px;
     border-bottom-right-radius: 10px;
     border-left: 1px solid rgba(128,128,128,0.35);
     margin-left: 4px;
     transition: background 0.15s ease;
 }

 #gptpdf-more:hover {
     background-color: rgba(0,0,0,0.06);
 }

 ${GPTPDF_DARK} #gptpdf-more:hover {
     background-color: rgba(255,255,255,0.1);
 }

 #gptpdf-convert-main:not(:hover) #gptpdf-more:not(:hover) {
     background: transparent;
 }

#gptpdf-extra-btns {
    position: absolute;
    top: 42px;
    right: 0;

    min-width: 270px;

    padding: 6px;

    border-radius: 14px;

    border: 1px solid rgba(0,0,0,0.08);

    background: #ffffff;

    backdrop-filter: blur(16px);

    color: rgba(0,0,0,0.85);

    box-shadow: 0 8px 32px rgba(0,0,0,0.12);

    overflow: hidden;

    z-index: 99999;
}

${GPTPDF_DARK} #gptpdf-extra-btns {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(32, 33, 35, 0.96);
    color: rgba(255,255,255,0.92);
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
}

.gptpdf-active .gptpdf-menu-icon,
.gptpdf-active .gptpdf-menu-title {
    color: #EA4C3A !important;
}

.gptpdf-active {
    background: rgba(234,76,58,0.08) !important;
}

${GPTPDF_DARK} .gptpdf-active {
    background: rgba(234,76,58,0.18) !important;
}

${GPTPDF_DARK} .gptpdf-active .gptpdf-menu-icon,
${GPTPDF_DARK} .gptpdf-active .gptpdf-menu-title {
    color: #ff9b8f !important;
}

.gptpdf-extra-btn:hover {
    background: rgba(0,0,0,0.05);
}

${GPTPDF_DARK} .gptpdf-extra-btn:hover {
    background: rgba(255,255,255,0.06);
}

.gptpdf-divider {
    height: 1px;

    margin: 6px 4px;

    background: rgba(0,0,0,0.08);
}

${GPTPDF_DARK} .gptpdf-divider {
    background: rgba(255,255,255,0.08);
}

.gptpdf-extra-btn {
    width: 100%;

    display: flex;
    align-items: center;
    gap: 12px;

    padding: 9px 10px;

    border: none;
    border-radius: 10px;

    background: transparent;

    color: rgba(0,0,0,0.85);

    font-size: 14px;
    font-weight: 400;

    text-align: left;
    text-decoration: none;

    cursor: pointer;
    box-sizing: border-box;

    transition: background 0.15s ease;
}

${GPTPDF_DARK} .gptpdf-extra-btn {
    color: rgba(255,255,255,0.92);
}

.gptpdf-menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: rgba(0,0,0,0.06);
    flex-shrink: 0;
    color: rgba(0,0,0,0.55);
}

${GPTPDF_DARK} .gptpdf-menu-icon {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.65);
}

.gptpdf-menu-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.gptpdf-menu-title {
    font-size: 14px;
    font-weight: 500;
    color: rgba(0,0,0,0.85);
    line-height: 1.3;
}

${GPTPDF_DARK} .gptpdf-menu-title {
    color: rgba(255,255,255,0.92);
}

.gptpdf-menu-desc {
    font-size: 12px;
    color: rgba(0,0,0,0.4);
    line-height: 1.3;
    margin-top: 2px;
}

${GPTPDF_DARK} .gptpdf-menu-desc {
    color: rgba(255,255,255,0.38);
}

.gptpdf-menu-arrow {
    font-size: 18px;
    color: rgba(0,0,0,0.25);
    flex-shrink: 0;
    line-height: 1;
}

${GPTPDF_DARK} .gptpdf-menu-arrow {
    color: rgba(255,255,255,0.25);
}

 .gptpdf-hidden {
     display: none;
 }

 #gptpdf-spinner {
     position: absolute;
     width: 100%;
     height: 100%;
 }

 .gptpdf-spinner {
     border: 4px solid #ccc;
     border-radius: 50%;
     border-top: 4px solid #ffc107;
     width: 1.5rem;
     height: 1.5rem;
     -webkit-animation: spin 1.5s linear infinite;
     animation: spin 1.5s linear infinite;
 }

 @-webkit-keyframes spin {
     0% { -webkit-transform: rotate(0deg); }
     100% { -webkit-transform: rotate(360deg); }
 }

 @keyframes spin {
     0% { transform: rotate(0deg); }
     100% { transform: rotate(360deg); }
 }

/* ── Three-dot button loader ────────────────────────────── */
.gptpdf-dots-loader {
    display: flex;
    align-items: center;
    gap: 5px;
}
.gptpdf-dots-loader span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #EA4C3A;
    animation: gptpdfDotPulse 1.2s ease-in-out infinite;
}
.gptpdf-dots-loader span:nth-child(1) { animation-delay: 0s; }
.gptpdf-dots-loader span:nth-child(2) { animation-delay: 0.2s; }
.gptpdf-dots-loader span:nth-child(3) { animation-delay: 0.4s; }
@keyframes gptpdfDotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.25; }
    40%            { transform: scale(1.15); opacity: 1; }
}

/* ── Rate Us dropdown panel ─────────────────────────────── */
#gptpdf-rateus-dropdown {
    position: absolute;
    top: 42px;
    right: 0;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.08);
    background: #ffffff;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    z-index: 99999;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
}
${GPTPDF_DARK} #gptpdf-rateus-dropdown {
    background: rgba(32,33,35,0.97);
    border-color: rgba(255,255,255,0.08);
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    color: rgba(255,255,255,0.9);
}
#gptpdf-rateus-dropdown .gptpdf-dropdown-label {
    font-size: 11px;
    color: rgba(0,0,0,0.45);
    letter-spacing: 0.03em;
}
${GPTPDF_DARK} #gptpdf-rateus-dropdown .gptpdf-dropdown-label {
    color: rgba(255,255,255,0.4);
}
#gptpdf-rateus-dropdown .gptpdf-stars { gap: 4px; }
#gptpdf-rateus-dropdown .gptpdf-star  { font-size: 22px; }
/* Видимый выход. Делает ровно то же, что клик мимо кнопки (спрятать до следующего экспорта) —
   об этом просто больше не надо догадываться. Просьба вернётся, это не «никогда». */
#gptpdf-rateus-dropdown .gptpdf-rateus-later {
    font-size: 11px;
    color: rgba(0,0,0,0.4);
    cursor: pointer;
    padding: 0 4px 1px;
    transition: color 0.15s;
}
#gptpdf-rateus-dropdown .gptpdf-rateus-later:hover { color: rgba(0,0,0,0.65); }
${GPTPDF_DARK} #gptpdf-rateus-dropdown .gptpdf-rateus-later { color: rgba(255,255,255,0.35); }
${GPTPDF_DARK} #gptpdf-rateus-dropdown .gptpdf-rateus-later:hover { color: rgba(255,255,255,0.6); }

 .gptpdf-invisible {
     visibility: hidden;
 }

 /* ── Block-selection mode ────────────────────────────────── */
 #gptpdf-blocks-bar {
     display: none;
     position: fixed;
     bottom: 24px;
     left: 50%;
     transform: translateX(-50%);
     background: #fff;
     border: 1px solid #ddd;
     border-radius: 12px;
     box-shadow: 0 4px 20px rgba(0,0,0,0.15);
     padding: 10px 16px;
     z-index: 2147483640;
     gap: 10px;
     align-items: center;
     font-size: 14px;
     color: #111;
     white-space: nowrap;
 }
 #gptpdf-blocks-bar.gptpdf-active { display: none; } /* replaced by main button */
 ${GPTPDF_DARK} #gptpdf-blocks-bar {
     background: #2a2a2a;
     border-color: #444;
     color: #eee;
 }
 #gptpdf-blocks-count { font-weight: 500; min-width: 130px; }
 #gptpdf-blocks-export {
     background: #EA4C3A;
     color: #fff;
     border: none;
     border-radius: 8px;
     padding: 7px 16px;
     font-size: 14px;
     font-weight: 500;
     cursor: pointer;
 }
 #gptpdf-blocks-export:disabled { opacity: 0.45; cursor: default; }
 #gptpdf-blocks-cancel {
     background: none;
     color: inherit;
     border: 1px solid #ccc;
     border-radius: 8px;
     padding: 7px 14px;
     font-size: 14px;
     cursor: pointer;
 }
 ${GPTPDF_DARK} #gptpdf-blocks-cancel { border-color: #555; }

 /* The selection colour of block mode (author 17.11: red reads as "delete",
    while a frame here says "this goes into the PDF") — a calm blue, the usual
    colour of "selected". Only block mode: the brand red stays on the buttons. */
 html {
     --gptpdf-sel: #2F6FED;
     --gptpdf-sel-tint: rgba(47,111,237,0.07);
     --gptpdf-sel-hover: rgba(47,111,237,0.30);
     --gptpdf-sel-hover-bg: rgba(47,111,237,0.04);
 }
 ${GPTPDF_DARK} {
     --gptpdf-sel: #6EA2FF;
     --gptpdf-sel-tint: rgba(110,162,255,0.12);
     --gptpdf-sel-hover: rgba(110,162,255,0.38);
     --gptpdf-sel-hover-bg: rgba(110,162,255,0.06);
 }

 /* Individual content blocks */
 .gptpdf-block-sel {
     position: relative;
     border-radius: 6px;
     cursor: pointer;
     transition: background 0.12s, outline 0.12s;
     outline: 2px solid transparent;
     overflow: visible !important; /* ensure checkbox not clipped by overflow:hidden */
 }
 .gptpdf-block-sel:hover {
     background: var(--gptpdf-sel-hover-bg);
     outline: 2px solid var(--gptpdf-sel-hover);
 }
 .gptpdf-block-sel.gptpdf-block-checked {
     background: var(--gptpdf-sel-tint);
     outline: 2px solid var(--gptpdf-sel);
 }
 .gptpdf-block-cb {
     position: absolute;
     top: 4px;
     right: 6px;
     z-index: 2147483600;
     display: flex;
     align-items: center;
     justify-content: center;
     pointer-events: none;
     background: rgba(255,255,255,0.85);
     border-radius: 4px;
     padding: 2px;
 }
 ${GPTPDF_DARK} .gptpdf-block-cb {
     background: rgba(40,40,40,0.85);
 }
 .gptpdf-block-cb .gptpdf-sel-cb { pointer-events: auto; }

 /* Our own checkbox, drawn whole: box, fill and tick. The page's styles reach
    a checkbox that sits inside an answer, and on the author's chats the
    browser's own one showed no tick when ticked (17.11). The class twice
    outweighs a page rule like .markdown input[type=checkbox]. */
 input.gptpdf-sel-cb.gptpdf-sel-cb[type=checkbox] {
     -webkit-appearance: none !important;
     appearance: none !important;
     width: 18px !important;
     height: 18px !important;
     min-width: 18px !important;
     margin-top: 0 !important;
     margin-bottom: 0 !important;
     padding: 0 !important;
     border: 1.5px solid #9aa1aa !important;
     border-radius: 5px !important;
     background: #fff !important;
     box-shadow: none !important;
     display: block !important;
     flex-shrink: 0;
     cursor: pointer !important;
     opacity: 1 !important;
 }
 ${GPTPDF_DARK} input.gptpdf-sel-cb.gptpdf-sel-cb[type=checkbox] {
     border-color: #8a8f96 !important;
     background: #262626 !important;
 }
 input.gptpdf-sel-cb.gptpdf-sel-cb[type=checkbox]:checked,
 ${GPTPDF_DARK} input.gptpdf-sel-cb.gptpdf-sel-cb[type=checkbox]:checked {
     border-color: var(--gptpdf-sel) !important;
     background: var(--gptpdf-sel) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.4 6.3l2.4 2.4 4.8-5.2' fill='none' stroke='white' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 13px 13px no-repeat !important;
 }
 input.gptpdf-sel-cb.gptpdf-sel-cb[type=checkbox]:focus-visible {
     outline: 2px solid var(--gptpdf-sel) !important;
     outline-offset: 2px;
 }
 .gptpdf-img-sel-row .gptpdf-sel-cb,
 .gptpdf-all-row .gptpdf-sel-cb { margin-left: auto !important; }
 .gptpdf-sel-label {
     font-size: 13px;
     font-weight: 500;
     color: var(--gptpdf-sel);
     user-select: none;
     pointer-events: none;
 }

 /* Selection row for image blocks */
 .gptpdf-img-sel-row {
     display: flex;
     align-items: center;
     gap: 8px;
     padding: 6px 10px;
     border-radius: 8px 8px 0 0;
     background: var(--gptpdf-sel-hover-bg);
     border: 2px solid var(--gptpdf-sel-hover);
     border-bottom: none;
     cursor: pointer;
     transition: background 0.12s;
 }
 .gptpdf-img-sel-row:hover {
     background: var(--gptpdf-sel-tint);
 }
 .gptpdf-img-sel-row.gptpdf-img-sel-checked {
     background: var(--gptpdf-sel-tint);
     border-color: var(--gptpdf-sel);
 }
 /* "Select all" — the same selection row one level up: it stands above the
    first block and speaks for every block under it, so it closes on all four
    sides instead of sitting flush on top of one block. */
 .gptpdf-all-row {
     border-radius: 8px;
     border-bottom: 2px dashed var(--gptpdf-sel-hover);
     border-style: dashed;
     margin: 0 0 10px;
 }
 .gptpdf-all-row.gptpdf-img-sel-checked {
     border-style: solid;
     border-bottom: 2px solid var(--gptpdf-sel);
 }

 /* ── Rate us stars ──────────────────────────────────────── */
 .gptpdf-rate-row {
     display: flex;
     align-items: center;
     gap: 8px;
     padding: 10px 14px;
     font-size: 12px;
     color: #888;
     border-top: 1px solid rgba(0,0,0,0.07);
 }
 ${GPTPDF_DARK} .gptpdf-rate-row { border-top-color: rgba(255,255,255,0.08); color: #666; }
 .gptpdf-stars {
     display: flex;
     gap: 2px;
     cursor: pointer;
 }
 .gptpdf-star {
     font-size: 16px;
     color: #ddd;
     transition: color 0.1s;
     line-height: 1;
     user-select: none;
 }
 ${GPTPDF_DARK} .gptpdf-star { color: #444; }
 .gptpdf-star.filled { color: #EA4C3A; }
 /* CSS-only hover: all stars orange on hover, stars after hovered one go gray */
 .gptpdf-stars:hover .gptpdf-star { color: #EA4C3A !important; }
 .gptpdf-stars .gptpdf-star:hover ~ .gptpdf-star { color: #ddd !important; }

 .gptpdf-loading-overlay {
     z-index: 10001;
     display: none;
     position: fixed;
     inset: 0;
     background: rgba(0, 0, 0, 0.45);
 }
 .gptpdf-loading-overlay.gptpdf-dark { background: rgba(0, 0, 0, 0.62); }
 /* The progress panel sits under the Export button — one place for every step
    of an export, where the button's own menu opens. The one number (time since
    the click) is the button's counter; the panel has words only (07.10). While
    the chat is being read the page is dimmed and the button and panel stay above
    the dimming; after that there is no dimming and the panel stays put. */
 .gptpdf-block.gptpdf-exporting #gptpdf-convert-main { position: relative; z-index: 10002; }
 .gptpdf-loading-card {
     display: none;
     position: absolute;
     top: calc(100% + 10px);
     right: 0;
     z-index: 10002;
     flex-direction: column;
     align-items: flex-start;
     gap: 6px;
     width: 300px;
     padding: 14px 16px;
     background: #fff;
     color: #222;
     border-radius: 12px;
     box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
     font-size: 14px;
     text-align: left;
 }
 .gptpdf-loading-card.gptpdf-dark {
     background: #2a2a2a;
     color: #ededed;
     border: 1px solid rgba(255, 255, 255, 0.08);
     box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
 }
 .gptpdf-loading-card { --gptpdf-card-bg: #fff; }
 .gptpdf-loading-card.gptpdf-dark { --gptpdf-card-bg: #2a2a2a; }
 /* The figure that acts out the reading (anim.js), in the card's text colour. */
 .gptpdf-anim { display: none; width: 100%; margin: 2px 0 0; }
 .gptpdf-anim.on { display: block; }
 .gptpdf-anim svg { display: block; width: 100%; height: auto; overflow: hidden; }
 .gptpdf-anim .a-out rect { fill: none; stroke: currentColor; stroke-opacity: .35; stroke-dasharray: 3 3; }
 .gptpdf-anim .a-in rect { fill: currentColor; fill-opacity: .42; stroke: none; }
 .gptpdf-anim .a-frame { fill: none; stroke: currentColor; stroke-width: 1.5; }
 .gptpdf-anim .a-thin { stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
 .gptpdf-anim .a-limb { fill: none; stroke: currentColor; stroke-width: 3.5; stroke-linecap: round; }
 .gptpdf-anim .a-ink { fill: currentColor; stroke: none; }
 .gptpdf-anim .a-eye { fill: var(--gptpdf-card-bg); stroke: none; }
 .gptpdf-anim .a-sheet { fill: var(--gptpdf-card-bg); stroke: currentColor; stroke-width: 1; }
 .gptpdf-anim .a-pen { stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
 .gptpdf-loading-text { font-weight: 600; line-height: 1.35; }
 .gptpdf-loading-fact { font-size: 13px; line-height: 1.4; opacity: .85; }
 .gptpdf-loading-hint { font-size: 12px; line-height: 1.4; opacity: .65; }
 .gptpdf-loading-fact:empty, .gptpdf-loading-hint:empty { display: none; }
 .gptpdf-loading-cancel {
     align-self: flex-end;
     margin-top: 4px;
     padding: 6px 18px;
     border: 1px solid rgba(0, 0, 0, 0.15);
     border-radius: 8px;
     background: transparent;
     color: inherit;
     font-size: 13px;
     cursor: pointer;
 }
 .gptpdf-loading-cancel:hover { background: rgba(0, 0, 0, 0.06); }
 .gptpdf-loading-card.gptpdf-dark .gptpdf-loading-cancel { border-color: rgba(255, 255, 255, 0.2); }
 .gptpdf-loading-card.gptpdf-dark .gptpdf-loading-cancel:hover { background: rgba(255, 255, 255, 0.1); }
 .gptpdf-loading-overlay .gptpdf-spinner { width: 2.4rem; height: 2.4rem; border-width: 4px; }

 .gptpdf-overlay {
     z-index: 10000;
     display: none;
     position: fixed;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
     background: rgba(0, 0, 0, 0.5);
     justify-content: center;
     align-items: center;
     color: #000;
 }

 .gptpdf-dialog {
     background: #fff;
     padding: 0;
     margin: 0.5em;
     max-width: 380px;
     border-radius: 14px;
     box-shadow: 0 10px 34px rgba(0, 0, 0, 0.22);
     text-align: start;
     overflow: hidden;
 }

 .gptpdf-dialog a {
     color: revert;
 }

 .gptpdf-dialog-body {
     padding: 16px 20px;
     line-height: 1.5;
 }

 .gptpdf-dialog-footer {
     text-align: right;
     padding: 12px 18px;
     position: relative;
 }

 .gptpdf-dialog-header {
     font-size: 1.05em;
     font-weight: 600;
     padding: 13px 18px;
     border-bottom: 1px solid rgba(0, 0, 0, 0.08);
 }

 .gptpdf-version {
     position: absolute;
     bottom: 0;
     right: 0;
     font-size: .65em;
     color: #777;
 }

 .gptpdf-dialog ul {
     list-style: disc;
     margin: 0;
     padding: 0 0 0 2em;
 }

 .gptpdf-close-x {
     cursor: pointer;
     float: right;
     color: #777;
 }

 .gptpdf-py-1 {
     padding-bottom: 0.25rem;
     padding-top: 0.25rem;
 }

 .gptpdf-px-2 {
     padding-left: 0.5rem;
     padding-right: 0.5rem;
 }

 .gptpdf-mr-1 {
     margin-right: 0.25rem;
 }

 .gptpdf-mr-4 {
     margin-right: 1rem;
 }

 .gptpdf-justify-center {
     justify-content: center;
 }

 .gptpdf-items-center {
     align-items: center;
 }

 .gptpdf-flex {
     display: flex;
 }

 .gptpdf-text-left {
     text-align: left;
 }

 .gptpdf-text-right {
     text-align: right;
 }

 .gptpdf-h-9 {
     height: 2.25rem;
 }

 #gptpdf-title {
     margin: 0 !important;
     padding: 8px 11px !important;
     border: 1.5px solid rgba(0,0,0,0.15) !important;
     border-radius: 8px !important;
     visibility: revert !important;
     display: block !important;
     color: inherit !important;
     background: #fff !important;
     width: 100% !important;
     box-sizing: border-box !important;
     font-size: 14px !important;
     line-height: 1.4 !important;
     outline: none !important;
     transition: border-color 0.15s;
 }
 #gptpdf-title:focus {
     border-color: #EA4C3A !important;
     box-shadow: 0 0 0 3px rgba(234,76,58,0.12) !important;
 }
 ${GPTPDF_DARK} #gptpdf-title {
     background: #3a3a3a !important;
     border-color: rgba(255,255,255,0.18) !important;
     color: #e8e8e8 !important;
 }
 #gptpdf-title-dialog {
     background: #fff;
     border-radius: 16px;
     box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
     width: 360px;
     overflow: hidden;
     font-family: inherit;
 }
 ${GPTPDF_DARK} #gptpdf-title-dialog {
     background: #2a2a2a;
     color: #e8e8e8;
 }
 #gptpdf-title-dialog-header {
     display: flex;
     align-items: center;
     justify-content: space-between;
     padding: 16px 18px 12px;
     font-size: 15px;
     font-weight: 600;
     border-bottom: 1px solid rgba(0,0,0,0.07);
 }
 ${GPTPDF_DARK} #gptpdf-title-dialog-header {
     border-bottom-color: rgba(255,255,255,0.08);
 }
 #gptpdf-title-close-btn {
     background: none;
     border: none;
     cursor: pointer;
     font-size: 18px;
     line-height: 1;
     color: rgba(0,0,0,0.35);
     padding: 2px 4px;
     border-radius: 6px;
     transition: background 0.15s, color 0.15s;
 }
 #gptpdf-title-close-btn:hover { background: rgba(0,0,0,0.06); color: rgba(0,0,0,0.7); }
 ${GPTPDF_DARK} #gptpdf-title-close-btn { color: rgba(255,255,255,0.4); }
 ${GPTPDF_DARK} #gptpdf-title-close-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
 #gptpdf-title-dialog-body { padding: 14px 18px; }
 #gptpdf-title-dialog-footer {
     display: flex;
     gap: 8px;
     justify-content: flex-end;
     padding: 10px 18px 16px;
 }
 #gptpdf-title-convert {
     background: linear-gradient(135deg, #EA4C3A, #c0392b) !important;
     color: #fff !important;
     border: none !important;
     border-radius: 8px !important;
     padding: 8px 20px !important;
     font-size: 13px !important;
     font-weight: 600 !important;
     cursor: pointer !important;
     transition: opacity 0.15s !important;
 }
 #gptpdf-title-convert:hover { opacity: 0.88 !important; }
 #gptpdf-title-cancel-btn {
     background: rgba(0,0,0,0.05);
     color: inherit;
     border: none;
     border-radius: 8px;
     padding: 8px 16px;
     font-size: 13px;
     font-weight: 500;
     cursor: pointer;
     transition: background 0.15s;
 }
 #gptpdf-title-cancel-btn:hover { background: rgba(0,0,0,0.09); }
 ${GPTPDF_DARK} #gptpdf-title-cancel-btn { background: rgba(255,255,255,0.08); }
 ${GPTPDF_DARK} #gptpdf-title-cancel-btn:hover { background: rgba(255,255,255,0.13); }

 .gptpdf-category {
     line-height: normal;
     margin-top: 1em;
 }

 .gptpdf-category-title {
     font-size: larger;
     font-weight: bold;
 }

/* ===== Settings Modal ===== */
#gptpdf-settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    animation: gptpdf-fade-in 0.15s ease;
}
@keyframes gptpdf-fade-in { from{opacity:0} to{opacity:1} }

#gptpdf-settings-modal {
    width: 700px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 60px);
    border-radius: 18px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #f7f7f8;
    color: rgba(0,0,0,0.85);
    box-shadow: 0 24px 80px rgba(0,0,0,0.3);
    animation: gptpdf-slide-up 0.2s ease;
    font-family: inherit;
    font-size: 14px;
}
${GPTPDF_DARK} #gptpdf-settings-modal {
    background: #202123;
    color: rgba(255,255,255,0.92);
}
@keyframes gptpdf-slide-up { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }

#gptpdf-settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px 16px;
    border-bottom: 1px solid rgba(0,0,0,0.08);
    flex-shrink: 0;
}
${GPTPDF_DARK} #gptpdf-settings-header { border-bottom-color: rgba(255,255,255,0.08); }

#gptpdf-settings-header h2 {
    font-size: 16px; font-weight: 600; margin: 0; padding: 0; color: inherit;
}
#gptpdf-settings-close {
    width: 28px; height: 28px; border: none;
    background: rgba(0,0,0,0.06); border-radius: 50%;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: rgba(0,0,0,0.5); transition: background 0.15s;
    line-height: 1;
}
#gptpdf-settings-close:hover { background: rgba(0,0,0,0.1); }
${GPTPDF_DARK} #gptpdf-settings-close { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
${GPTPDF_DARK} #gptpdf-settings-close:hover { background: rgba(255,255,255,0.15); }

#gptpdf-settings-body { display: flex; flex: 1; overflow: hidden; }

#gptpdf-settings-form {
    flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
}

#gptpdf-settings-preview-col {
    width: 196px; flex-shrink: 0; padding: 14px 14px 14px 0;
    display: flex; flex-direction: column; align-items: center;
    border-left: 1px solid rgba(0,0,0,0.06);
}
${GPTPDF_DARK} #gptpdf-settings-preview-col { border-left-color: rgba(255,255,255,0.06); }

#gptpdf-settings-footer {
    display: flex; align-items: center; justify-content: flex-end;
    gap: 8px; padding: 12px 20px;
    border-top: 1px solid rgba(0,0,0,0.08); flex-shrink: 0;
}
${GPTPDF_DARK} #gptpdf-settings-footer { border-top-color: rgba(255,255,255,0.08); }

.gptpdf-section {
    background: #fff; border-radius: 14px; padding: 12px 14px;
    display: flex; flex-direction: column; gap: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
${GPTPDF_DARK} .gptpdf-section { background: rgba(255,255,255,0.05); }

.gptpdf-section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.09em; color: rgba(0,0,0,0.38); margin-bottom: -2px;
}
${GPTPDF_DARK} .gptpdf-section-title { color: rgba(255,255,255,0.32); }

.gptpdf-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; min-height: 30px;
}
.gptpdf-label { font-size: 13px; font-weight: 500; color: rgba(0,0,0,0.75); flex-shrink: 0; }
${GPTPDF_DARK} .gptpdf-label { color: rgba(255,255,255,0.8); }

.gptpdf-segment {
    display: flex; background: rgba(0,0,0,0.06);
    border-radius: 9px; padding: 2px; gap: 1px;
}
${GPTPDF_DARK} .gptpdf-segment { background: rgba(255,255,255,0.08); }

.gptpdf-seg-btn {
    flex: 1; padding: 4px 9px; border: none; border-radius: 7px;
    background: transparent; font-size: 12px; font-weight: 500;
    color: rgba(0,0,0,0.45); cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
${GPTPDF_DARK} .gptpdf-seg-btn { color: rgba(255,255,255,0.4); }
.gptpdf-seg-btn.active {
    background: #fff; color: rgba(0,0,0,0.85);
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}
${GPTPDF_DARK} .gptpdf-seg-btn.active { background: rgba(255,255,255,0.18); color: rgba(255,255,255,0.92); }

.gptpdf-toggle { position: relative; display: inline-block; width: 38px; height: 22px; cursor: pointer; flex-shrink: 0; }
.gptpdf-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.gptpdf-toggle-track {
    position: absolute; inset: 0; border-radius: 11px;
    background: rgba(0,0,0,0.15); transition: background 0.2s;
}
${GPTPDF_DARK} .gptpdf-toggle-track { background: rgba(255,255,255,0.2); }
.gptpdf-toggle input:checked + .gptpdf-toggle-track { background: #EA4C3A; }
.gptpdf-toggle-track::after {
    content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%;
    background: #fff; top: 3px; left: 3px;
    transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.gptpdf-toggle input:checked + .gptpdf-toggle-track::after { transform: translateX(16px); }

.gptpdf-slider-row { display: flex; align-items: center; gap: 10px; flex: 1; }
.gptpdf-slider {
    flex: 1; height: 4px; -webkit-appearance: none; appearance: none;
    background: rgba(0,0,0,0.12); border-radius: 2px; outline: none; cursor: pointer;
}
${GPTPDF_DARK} .gptpdf-slider { background: rgba(255,255,255,0.15); }
.gptpdf-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
    background: #EA4C3A; cursor: pointer; box-shadow: 0 1px 4px rgba(234,76,58,0.4);
}
.gptpdf-slider-value { font-size: 12px; font-weight: 600; color: rgba(0,0,0,0.5); min-width: 32px; text-align: right; }
${GPTPDF_DARK} .gptpdf-slider-value { color: rgba(255,255,255,0.5); }

.gptpdf-swatches { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
.gptpdf-swatch {
    height: 26px; padding: 0 9px; border-radius: 7px;
    border: 1.5px solid transparent; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
    background: rgba(0,0,0,0.06); color: rgba(0,0,0,0.55);
}
${GPTPDF_DARK} .gptpdf-swatch { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
.gptpdf-swatch.active { border-color: #EA4C3A; color: #EA4C3A; background: rgba(234,76,58,0.08); }
.gptpdf-swatch-color-wrap { display: flex; align-items: center; gap: 5px; }
.gptpdf-swatch-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0; }
.gptpdf-color-input { width: 30px; height: 26px; border-radius: 7px; border: 1.5px solid rgba(0,0,0,0.12); padding: 2px; cursor: pointer; background: none; }

.gptpdf-theme-cards { display: flex; gap: 7px; width: 100%; }
.gptpdf-theme-card {
    flex: 1; border: 2px solid rgba(0,0,0,0.08); border-radius: 10px;
    padding: 8px 6px 7px; cursor: pointer; transition: all 0.15s;
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    background: transparent; font-size: 11px; font-weight: 500; color: rgba(0,0,0,0.5);
}
${GPTPDF_DARK} .gptpdf-theme-card { border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.45); }
.gptpdf-theme-card.active { border-color: #EA4C3A !important; color: #EA4C3A !important; background: rgba(234,76,58,0.09) !important; box-shadow: 0 0 0 1px rgba(234,76,58,0.3); }
${GPTPDF_DARK} .gptpdf-theme-card.active { color: #ff9b8f !important; }
.gptpdf-theme-mini-doc {
    width: 44px; height: 56px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);
    padding: 5px 4px; gap: 3px; display: flex; flex-direction: column;
}
.gptpdf-theme-mini-doc.light { background: #fff; }
.gptpdf-theme-mini-doc.dark { background: #333; border-color: rgba(255,255,255,0.1); }
.gptpdf-mini-line { height: 3px; border-radius: 2px; background: rgba(0,0,0,0.18); }
.gptpdf-mini-line.on-dark { background: rgba(255,255,255,0.3); }
.gptpdf-mini-line.w100 { width: 100%; }
.gptpdf-mini-line.w75 { width: 75%; }
.gptpdf-mini-line.w50 { width: 50%; }

.gptpdf-sub-section {
    flex-direction: column; gap: 8px; padding-top: 10px;
    border-top: 1px solid rgba(0,0,0,0.06); margin-top: 2px;
}
${GPTPDF_DARK} .gptpdf-sub-section { border-top-color: rgba(255,255,255,0.06); }
.gptpdf-margins-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.gptpdf-margin-field { display: flex; flex-direction: column; gap: 3px; }
.gptpdf-margin-field label { font-size: 11px; color: rgba(0,0,0,0.4); font-weight: 500; }
${GPTPDF_DARK} .gptpdf-margin-field label { color: rgba(255,255,255,0.35); }
.gptpdf-margin-input {
    width: 100%; padding: 5px 8px; border: 1px solid rgba(0,0,0,0.12); border-radius: 7px;
    font-size: 12px; background: rgba(0,0,0,0.03); color: inherit; outline: none; box-sizing: border-box;
}
${GPTPDF_DARK} .gptpdf-margin-input { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); }
.gptpdf-margin-input:focus { border-color: #EA4C3A; }

.gptpdf-btn-reset {
    padding: 7px 14px; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 10px;
    background: transparent; font-size: 13px; font-weight: 500; color: rgba(0,0,0,0.5); cursor: pointer; transition: all 0.15s;
}
${GPTPDF_DARK} .gptpdf-btn-reset { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.45); }
.gptpdf-btn-reset:hover { background: rgba(0,0,0,0.05); }
${GPTPDF_DARK} .gptpdf-btn-reset:hover { background: rgba(255,255,255,0.05); }

.gptpdf-btn-apply {
    padding: 7px 18px; border: none; border-radius: 10px;
    background: #EA4C3A; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s;
}
.gptpdf-btn-apply:hover { background: #d44433; }

.gptpdf-saved-note { font-size: 12px; color: #2c9e5c; opacity: 0; transition: opacity 0.3s; margin-right: auto; }
.gptpdf-saved-note.visible { opacity: 1; }

#gptpdf-preview-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em;
    color: rgba(0,0,0,0.32); margin-bottom: 10px; align-self: flex-start; margin-left: 16px;
}
${GPTPDF_DARK} #gptpdf-preview-label { color: rgba(255,255,255,0.28); }

#gptpdf-preview-doc {
    width: 152px; border-radius: 8px; padding: 12px 10px;
    display: flex; flex-direction: column; gap: 7px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15); transition: background 0.3s; overflow: hidden;
    position: relative;
}
/* Альбомный лист печатается в две колонки — превью обязано показывать то же.
   Flex-колонка с gap для многоколоночной раскладки не годится, поэтому на время
   альбомного переключаемся на block + column-count, а gap заменяем отступом. */
#gptpdf-preview-doc.gptpdf-prev-columns {
    display: block; column-count: 2; column-gap: 9px;
}
#gptpdf-preview-doc.gptpdf-prev-columns > * { margin-bottom: 7px; break-inside: avoid; }
#gptpdf-preview-doc.preview-light { background: #fff; }
#gptpdf-preview-doc.preview-dark { background: #333; }

.gptpdf-prev-title { height: 7px; background: rgba(0,0,0,0.3) !important; border-radius: 3px; width: 65%; margin-bottom: 3px; flex-shrink: 0; }
.preview-dark .gptpdf-prev-title { background: rgba(255,255,255,0.4) !important; }

.gptpdf-prev-user { border-radius: 3px; padding: 5px 6px; display: flex; flex-direction: column; gap: 3px; transition: all 0.2s; }
.gptpdf-prev-line { height: 3px; border-radius: 2px; background: rgba(0,0,0,0.15); }
.preview-dark .gptpdf-prev-line { background: rgba(255,255,255,0.22); }
.gptpdf-prev-line.w80 { width: 80%; }
.gptpdf-prev-line.w60 { width: 60%; }
.gptpdf-prev-line.w90 { width: 90%; }
.gptpdf-prev-line.w40 { width: 40%; }
 .gptpdf-prev-line.w55 { width: 55%; }
.gptpdf-prev-ai { display: flex; flex-direction: column; gap: 3px; padding: 2px 0; }
.gptpdf-prev-break { height: 0; border-top: 1.5px dashed rgba(0,0,0,0.18); margin: 2px 0; }
.preview-dark .gptpdf-prev-break { border-top-color: rgba(255,255,255,0.2); }

/* ═══ 1.2.6 — the way into Settings: page 1 of this chat in the Export menu ═══ */
#gptpdf-extra-btns { min-width: 0; width: 440px; }
.gptpdf-menu-main { display: flex; gap: 4px; align-items: stretch; }
.gptpdf-menu-actions { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.gptpdf-sheet-entry {
    flex: 0 0 120px; display: flex; flex-direction: column; align-items: center; gap: 7px;
    padding: 10px 6px 8px; border-radius: 10px; text-decoration: none !important; color: inherit;
    cursor: pointer;
}
.gptpdf-sheet-entry:hover { background: rgba(0,0,0,0.05); }
${GPTPDF_DARK} .gptpdf-sheet-entry:hover { background: rgba(255,255,255,0.08); }
.gptpdf-sheet-wrap { position: relative; display: block; }
.gptpdf-sheet-frame {
    display: block; width: 92px; height: 130px; border-radius: 2px; background: #fff;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.12);
    transition: transform .15s ease, box-shadow .15s ease;
}
${GPTPDF_DARK} .gptpdf-sheet-frame { box-shadow: 0 0 0 1px rgba(255,255,255,0.14), 0 2px 8px rgba(0,0,0,0.5); }
.gptpdf-sheet-entry:hover .gptpdf-sheet-frame { transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(0,0,0,0.12), 0 8px 18px rgba(0,0,0,0.18); }
.gptpdf-sheet-pill {
    position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%);
    background: rgba(20,20,20,0.82); color: #fff; font-size: 11px; font-weight: 600;
    padding: 3px 9px; border-radius: 999px; opacity: 0; transition: opacity .15s;
    pointer-events: none; white-space: nowrap;
}
.gptpdf-sheet-entry:hover .gptpdf-sheet-pill { opacity: 1; }
.gptpdf-sheet-cap { font-size: 12px; line-height: 1.3; text-align: center; color: rgba(0,0,0,0.5); }
.gptpdf-sheet-cap b { color: rgba(0,0,0,0.85); font-weight: 600; }
${GPTPDF_DARK} .gptpdf-sheet-cap { color: rgba(255,255,255,0.5); }
${GPTPDF_DARK} .gptpdf-sheet-cap b { color: rgba(255,255,255,0.9); }

/* ═══ 1.2.6 — Settings window: the sheet on the left, Style · Paper · Header ═══ */
#gptpdf-settings-modal.gptpdf-sw { width: 980px; height: 700px; max-height: calc(100vh - 40px); background: #fff; }
${GPTPDF_DARK} #gptpdf-settings-modal.gptpdf-sw { background: #2a2a2a; }
.gptpdf-sw-body { display: flex; flex: 1; min-height: 0; }
.gptpdf-sw-stage {
    flex: 0 0 44%; min-width: 0; background: #efeff1;
    display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 18px 12px;
}
${GPTPDF_DARK} .gptpdf-sw-stage { background: #1b1b1b; }
.gptpdf-sw-sheetbox { flex: 1; width: 100%; min-height: 0; display: flex; align-items: center; justify-content: center; }
#gptpdf-sw-sheet { display: block; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 10px 30px rgba(0,0,0,.14); }
.gptpdf-sw-cap { margin-top: 10px; font-size: 12px; line-height: 1.35; color: rgba(0,0,0,0.5); text-align: center; min-height: 16px; max-width: 380px; }
${GPTPDF_DARK} .gptpdf-sw-cap { color: rgba(255,255,255,0.5); }
.gptpdf-sw-ctrl { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.gptpdf-sw-tabs { display: flex; gap: 4px; padding: 12px 20px 0; background: #f7f7f8; border-bottom: 1px solid rgba(0,0,0,0.08); }
${GPTPDF_DARK} .gptpdf-sw-tabs { background: #242424; border-bottom-color: rgba(255,255,255,0.08); }
.gptpdf-sw-tab {
    border: 1px solid transparent; border-bottom: 0; background: transparent; border-radius: 10px 10px 0 0;
    padding: 7px 16px 8px; cursor: pointer; color: rgba(0,0,0,0.5); font: inherit; font-size: 13px; font-weight: 500;
    position: relative; top: 1px;
}
.gptpdf-sw-tab:hover { color: rgba(0,0,0,0.85); }
.gptpdf-sw-tab.on { background: #fff; border-color: rgba(0,0,0,0.08); color: rgba(0,0,0,0.88); }
${GPTPDF_DARK} .gptpdf-sw-tab { color: rgba(255,255,255,0.5); }
${GPTPDF_DARK} .gptpdf-sw-tab:hover { color: rgba(255,255,255,0.85); }
${GPTPDF_DARK} .gptpdf-sw-tab.on { background: #2a2a2a; border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); }
.gptpdf-sw-panes { flex: 1; overflow-y: auto; padding: 16px 20px 20px; }
.gptpdf-sw-pane { display: none; }
.gptpdf-sw-pane.on { display: block; }
.gptpdf-sw-sec { display: flex; align-items: center; justify-content: space-between; margin: 0 0 10px; }
.gptpdf-sw-sec-l { font-size: 10.5px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: rgba(0,0,0,0.4); }
${GPTPDF_DARK} .gptpdf-sw-sec-l { color: rgba(255,255,255,0.35); }
.gptpdf-sw-state { border: 0; background: transparent; padding: 3px 0; font: inherit; font-size: 12px; color: rgba(0,0,0,0.45); cursor: default; }
${GPTPDF_DARK} .gptpdf-sw-state { color: rgba(255,255,255,0.45); }
.gptpdf-sw-state.custom { background: rgba(234,76,58,0.10); color: #c93a2a; font-weight: 600; padding: 3px 10px; border-radius: 999px; cursor: pointer; }
${GPTPDF_DARK} .gptpdf-sw-state.custom { background: rgba(234,76,58,0.22); color: #ff9b8f; }
.gptpdf-sw-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
.gptpdf-sw-tile {
    border: 1.5px solid rgba(0,0,0,0.12); background: #fff; border-radius: 14px; padding: 12px 8px 10px;
    cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; color: inherit; font: inherit;
}
.gptpdf-sw-tile:hover { background: rgba(0,0,0,0.03); }
.gptpdf-sw-tile.on { border-color: #EA4C3A; background: rgba(234,76,58,0.07); }
.gptpdf-sw-tile.base { border-style: dashed; border-color: #EA4C3A; }
${GPTPDF_DARK} .gptpdf-sw-tile { background: #2f2f2f; border-color: rgba(255,255,255,0.12); }
${GPTPDF_DARK} .gptpdf-sw-tile.on { background: rgba(234,76,58,0.16); border-color: #EA4C3A; }
.gptpdf-sw-mini { display: block; border-radius: 2px; box-shadow: 0 0 0 1px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.10); }
.gptpdf-sw-tile .nm { font-weight: 600; font-size: 13.5px; line-height: 1.1; }
.gptpdf-sw-tile .ds { font-size: 11.5px; line-height: 1.2; text-align: center; color: rgba(0,0,0,0.5); }
${GPTPDF_DARK} .gptpdf-sw-tile .ds { color: rgba(255,255,255,0.5); }
.gptpdf-sw-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; padding: 3px 0; }
.gptpdf-sw-row + .gptpdf-sw-row { border-top: 1px solid rgba(0,0,0,0.07); }
${GPTPDF_DARK} .gptpdf-sw-row + .gptpdf-sw-row { border-top-color: rgba(255,255,255,0.07); }
.gptpdf-sw-lb { font-size: 13px; font-weight: 500; white-space: nowrap; }
.gptpdf-sw-lb small { display: block; font-weight: 400; font-size: 11.5px; opacity: .55; white-space: normal; }
.gptpdf-sw .gptpdf-segment { flex: 0 0 auto; }
.gptpdf-sw .gptpdf-seg-btn { flex: 0 0 auto; font-size: 12.5px; padding: 5px 10px; display: inline-flex; align-items: center; gap: 5px; }
.gptpdf-sw-aa { font-size: 16px; line-height: 1; color: rgba(0,0,0,0.85); }
${GPTPDF_DARK} .gptpdf-sw-aa { color: rgba(255,255,255,0.9); }
.gptpdf-sw-step { display: inline-flex; align-items: center; background: rgba(0,0,0,0.06); border-radius: 9px; padding: 2px; }
${GPTPDF_DARK} .gptpdf-sw-step { background: rgba(255,255,255,0.08); }
.gptpdf-sw-step button { width: 28px; height: 26px; border: 0; border-radius: 7px; background: transparent; cursor: pointer; font-size: 16px; color: inherit; }
.gptpdf-sw-step button:hover { background: rgba(0,0,0,0.07); }
${GPTPDF_DARK} .gptpdf-sw-step button:hover { background: rgba(255,255,255,0.1); }
.gptpdf-sw-step button:disabled { opacity: .3; cursor: default; background: transparent; }
.gptpdf-sw-step output { min-width: 54px; text-align: center; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.gptpdf-sw-colors { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; max-width: 270px; }
.gptpdf-sw-colors button { width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.14); cursor: pointer; padding: 0; position: relative; }
${GPTPDF_DARK} .gptpdf-sw-colors button { border-color: rgba(255,255,255,0.2); }
.gptpdf-sw-colors button.on { outline: 2px solid #EA4C3A; outline-offset: 2px; }
.gptpdf-sw-colors button.none::after { content: ""; position: absolute; left: 3px; right: 3px; top: 50%; height: 1.5px; background: #c9c9c9; transform: rotate(-45deg); }
.gptpdf-sw-sheets { width: auto; }
.gptpdf-sw-sheets .gptpdf-theme-card { flex-direction: row; gap: 9px; padding: 6px 12px 6px 8px; width: auto; text-align: left; }
.gptpdf-sw-sheets .gptpdf-theme-card span { display: flex; flex-direction: column; font-weight: 600; font-size: 12.5px; line-height: 1.25; }
.gptpdf-sw-sheets .gptpdf-theme-card small { font-weight: 400; font-size: 11px; opacity: .7; }
.gptpdf-sw-custom { display: none; gap: 8px; justify-content: flex-end; padding: 0 0 8px; }
.gptpdf-sw-custom.on { display: flex; }
.gptpdf-sw-custom label { font-size: 11px; opacity: .65; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.gptpdf-sw-custom input { width: 54px; height: 28px; border-radius: 7px; border: 1px solid rgba(0,0,0,0.15); background: transparent; color: inherit; text-align: center; font: inherit; font-size: 12.5px; }
${GPTPDF_DARK} .gptpdf-sw-custom input { border-color: rgba(255,255,255,0.2); }
.gptpdf-sw-ver { margin-right: auto; font-size: 11.5px; opacity: .45; }
.gptpdf-dev-stamp { padding: 2px 10px 4px; font-size: 10.5px; color: rgba(0,0,0,0.35); text-align: right; }
${GPTPDF_DARK} .gptpdf-dev-stamp { color: rgba(255,255,255,0.35); }
`;

// Floating Export button + dropdown markup. Interpolates gptpdfShared.version
// The "Select all" row of block mode: stands above the first block and speaks
// for every block under it. Ticking it does not tick a hundred boxes — it flips
// the selection over, so the boxes below say what to LEAVE OUT.
const SELECT_ALL_ROW_HTML = `
    <span class="gptpdf-sel-label" style="font-weight:600">Select all</span>
    <input type="checkbox" class="gptpdf-sel-cb" style="margin-left:auto">`;

// (defined in shared.js, loaded before this file).
const EXPORT_BUTTON_HTML = `
    <button
        id="gptpdf-convert-main"
        type="button"
        role="button"
        tabindex="0"
        aria-label="Export"
        data-conv-options='{"page_size": "a4"}'
        class="btn btn-secondary btn-small gptpdf-h-9 gptpdf-convert gptpdf-fs-small">
        <span id="gptpdf-btn-left">
        <img class="gptpdf-mr-1 gptpdf-btn-content" src="data:image/png;base64,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" style="width:1rem;height:1rem;">
        <div class="gptpdf-lg gptpdf-btn-content">
            Export
        </div>
        </span>
        <div id="gptpdf-more" class="gptpdf-dropdown-arrow">
        </div>
        <div id="gptpdf-spinner" class="gptpdf-hidden">
            <div class="gptpdf-flex gptpdf-justify-center gptpdf-items-center gptpdf-mr-4" style="height: 100%;">
                <div class="gptpdf-dots-loader">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
        <div id="gptpdf-rateus-face" style="display:none;align-items:center;justify-content:center;gap:5px;width:100%;height:100%;padding:0 0.5rem;font-size:13px;font-weight:600;cursor:pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA4C3A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
            <span>Rate us</span>
        </div>
    </button>
    <div id="gptpdf-rateus-dropdown" style="display:none;">
        <div class="gptpdf-stars" id="gptpdf-dropdown-stars">
            <span class="gptpdf-star" data-n="1">★</span>
            <span class="gptpdf-star" data-n="2">★</span>
            <span class="gptpdf-star" data-n="3">★</span>
            <span class="gptpdf-star" data-n="4">★</span>
            <span class="gptpdf-star" data-n="5">★</span>
        </div>
        <div class="gptpdf-rateus-later" id="gptpdf-rateus-later">Not now</div>
    </div>
    <div id="gptpdf-no-chat-tooltip" class="gptpdf-no-chat-tooltip">
        Open a conversation first — then click Export
    </div>
    <button id="gptpdf-exit-select" title="Exit selection mode"
        style="display:none;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(0,0,0,0.2);background:white;cursor:pointer;font-size:13px;line-height:1;color:#555;margin-left:4px;flex-shrink:0">&#x2715;</button>

    <div id="gptpdf-extra-btns" class="gptpdf-hidden gptpdf-text-left">
      <div class="gptpdf-menu-main">
        <!-- 1.2.6: the way into Settings is page 1 of this chat, drawn by preview.js.
             Keeps the id common.js wires (gptpdf-options). -->
        <a id="gptpdf-options" href="#" class="gptpdf-sheet-entry"
           title="How your PDF will look — page 1 of this chat. Click to change the style, paper and header.">
            <span class="gptpdf-sheet-wrap"><span class="gptpdf-sheet-frame" id="gptpdf-menu-sheet"></span><span class="gptpdf-sheet-pill">Settings</span></span>
            <span class="gptpdf-sheet-cap"><b id="gptpdf-menu-style">Chat</b><br><span id="gptpdf-menu-paper">A4</span> · Settings&nbsp;›</span>
        </a>
        <div class="gptpdf-menu-actions">
        <button
            id="gptpdf-everything"
            type="button"
            class="gptpdf-extra-btn">
            <span class="gptpdf-menu-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="1.5" y="2.5" width="10" height="6.5" rx="2"/>
                    <rect x="6.5" y="9" width="10" height="6.5" rx="2"/>
                </svg>
            </span>
            <span class="gptpdf-menu-text">
                <span class="gptpdf-menu-title">Select all</span>
                <span class="gptpdf-menu-desc">Your prompts + AI answers</span>
            </span>
        </button>

        <button
            id="gptpdf-ai-only"
            type="button"
            class="gptpdf-extra-btn">
            <span class="gptpdf-menu-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 4a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5l-3 3V4z"/>
                    <path d="M12.5 2.5l-.6 1.3-1.3.6 1.3.6.6 1.3.6-1.3 1.3-.6-1.3-.6-.6-1.3z" fill="currentColor" stroke="none"/>
                </svg>
            </span>
            <span class="gptpdf-menu-text">
                <span class="gptpdf-menu-title">AI answers only</span>
                <span class="gptpdf-menu-desc">Exclude your prompts from the PDF</span>
            </span>
        </button>

        <button
            id="gptpdf-blocks"
            type="button"
            class="gptpdf-extra-btn">
            <span class="gptpdf-menu-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="1.5" y="4" width="7" height="7" rx="1.5"/>
                    <path d="M3 7.5l2 2 3-3" stroke-width="1.5"/>
                    <path d="M11 5.5h5.5M11 8h4M11 10.5h5.5" stroke-width="1.5"/>
                </svg>
            </span>
            <span class="gptpdf-menu-text">
                <span class="gptpdf-menu-title">Select to export</span>
                <span class="gptpdf-menu-desc">Pick blocks to export</span>
            </span>
        </button>
        </div>
      </div>

        <div class="gptpdf-divider"></div>

        <div class="gptpdf-rate-row">
            <span>Rate us</span>
            <div class="gptpdf-stars" id="gptpdf-stars">
                <span class="gptpdf-star" data-n="1">★</span>
                <span class="gptpdf-star" data-n="2">★</span>
                <span class="gptpdf-star" data-n="3">★</span>
                <span class="gptpdf-star" data-n="4">★</span>
                <span class="gptpdf-star" data-n="5">★</span>
            </div>
        </div>
        <!-- Dev builds only: which build is live in the browser (build.sh stamps it; prod is a clean number). -->
        ${/-dev/.test(gptpdfShared.build) ? '<div class="gptpdf-dev-stamp">build ' + gptpdfShared.build + '</div>' : ''}

    </div>

    <div class="gptpdf-overlay" id="gptpdf-error-overlay">
        <div class="gptpdf-dialog">
            <div class="gptpdf-dialog-header">
                Error occurred
                <span class="gptpdf-close-x gptpdf-close-btn">&times;</span>
            </div>
            <div class="gptpdf-dialog-body" style="text-align: center;">
                <p id="gptpdf-error-message"></p>
            </div>
            <div class="gptpdf-dialog-footer">
                <button class="gptpdf-loading-cancel gptpdf-close-btn">Close</button>
                <div class="gptpdf-version">${gptpdfShared.version}</div>
            </div>
        </div>
    </div>

    <!-- Asked when the harvest read noticeably less than the chat holds
         (common.js gptpdfAskPartial). No gptpdf-close-btn: every way out
         is an answer that is counted. -->
    <div class="gptpdf-overlay" id="gptpdf-partial-overlay">
        <div class="gptpdf-dialog">
            <div class="gptpdf-dialog-header">
                Only part of the chat was read
                <span class="gptpdf-close-x" id="gptpdf-partial-close">&times;</span>
            </div>
            <div class="gptpdf-dialog-body" style="text-align: center;">
                <p id="gptpdf-partial-message"></p>
            </div>
            <div class="gptpdf-dialog-footer">
                <button class="gptpdf-loading-cancel" id="gptpdf-partial-download">Download anyway</button>
                <button class="gptpdf-btn-apply" id="gptpdf-partial-retry" style="margin-left:8px">Try again</button>
                <div class="gptpdf-version">${gptpdfShared.version}</div>
            </div>
        </div>
    </div>

    <div id="gptpdf-blocks-bar">
        <span id="gptpdf-blocks-count">0 blocks selected</span>
        <button id="gptpdf-blocks-export">Export selected</button>
        <button id="gptpdf-blocks-cancel">Cancel</button>
    </div>

    <div class="gptpdf-loading-overlay" id="gptpdf-loading-overlay"></div>
    <div class="gptpdf-loading-card" id="gptpdf-progress">
        <div class="gptpdf-loading-text">Loading conversation…</div>
        <div class="gptpdf-anim" aria-hidden="true"></div>
        <div class="gptpdf-loading-fact"></div>
        <div class="gptpdf-loading-hint"></div>
        <button id="gptpdf-cancel-loading" class="gptpdf-loading-cancel">Cancel</button>
    </div>

    <div class="gptpdf-overlay" id="gptpdf-title-overlay">
        <div id="gptpdf-title-dialog">
            <div id="gptpdf-title-dialog-header">
                <span>Enter PDF title</span>
                <button id="gptpdf-title-close-btn" class="gptpdf-close-btn">&times;</button>
            </div>
            <div id="gptpdf-title-dialog-body">
                <input id="gptpdf-title" name="gptpdf-title-ch" autocomplete="off" autocapitalize="off" placeholder="e.g. My ChatGPT conversation">
            </div>
            <div id="gptpdf-title-dialog-footer">
                <button id="gptpdf-title-cancel-btn" class="gptpdf-close-btn">Cancel</button>
                <button id="gptpdf-title-convert">Export</button>
            </div>
        </div>
    </div>

    <div id="gptpdf-settings-overlay" style="display:none">
      <!-- Settings window 1.2.6 (mock: dizajn/obzor-2026-11-16/maket/nastrojki.html, README §8).
           Left: page 1 of this chat as it will print (preview.js). Right: Style · Paper · Header.
           Every change is saved at once; Done just closes. -->
      <div id="gptpdf-settings-modal" class="gptpdf-sw" role="dialog" aria-label="Settings">
        <div id="gptpdf-settings-header">
          <h2>Settings</h2>
          <button id="gptpdf-settings-close" title="Close — your choices are already saved">&#x2715;</button>
        </div>
        <div class="gptpdf-sw-body">
          <div class="gptpdf-sw-stage">
            <div class="gptpdf-sw-sheetbox" id="gptpdf-sw-sheetbox"><span id="gptpdf-sw-sheet"></span></div>
            <div class="gptpdf-sw-cap" id="gptpdf-sw-cap"></div>
          </div>
          <div class="gptpdf-sw-ctrl">
            <div class="gptpdf-sw-tabs">
              <button class="gptpdf-sw-tab on" data-tab="style" title="How the text looks">Style</button>
              <button class="gptpdf-sw-tab" data-tab="paper" title="Paper size, sheet colour, margins, pages">Paper</button>
              <button class="gptpdf-sw-tab" data-tab="header" title="What stands at the top of the PDF">Header</button>
            </div>
            <div class="gptpdf-sw-panes">

              <div class="gptpdf-sw-pane on" data-pane="style">
                <div class="gptpdf-sw-sec">
                  <span class="gptpdf-sw-sec-l">Style</span>
                  <button class="gptpdf-sw-state" id="gptpdf-sw-state"></button>
                </div>
                <div class="gptpdf-sw-tiles" id="gptpdf-sw-tiles">
                  <button class="gptpdf-sw-tile" data-style="chat" title="Sans-serif, questions in bubbles on the right — like the chat on your screen">
                    <span class="gptpdf-sw-mini"></span><span class="nm">Chat</span><span class="ds">like on screen</span></button>
                  <button class="gptpdf-sw-tile" data-style="doc" title="Serif, questions as bold lines — reads like a report">
                    <span class="gptpdf-sw-mini"></span><span class="nm">Document</span><span class="ds">to print or send</span></button>
                  <button class="gptpdf-sw-tile" data-style="compact" title="Narrow letters, smaller text, tighter lines — the same chat on fewer pages">
                    <span class="gptpdf-sw-mini"></span><span class="nm">Compact</span><span class="ds">fewer pages</span></button>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Font</span>
                  <div class="gptpdf-segment" id="gptpdf-look-font">
                    <button class="gptpdf-seg-btn" data-value="sans" title="Noto Sans — clean, like on screen"><span class="gptpdf-sw-aa" style="font-family:'Noto Sans',sans-serif">Aa</span>Sans</button>
                    <button class="gptpdf-seg-btn" data-value="serif" title="Noto Serif — bookish, good on paper"><span class="gptpdf-sw-aa" style="font-family:'Noto Serif',serif">Aa</span>Serif</button>
                    <button class="gptpdf-seg-btn" data-value="narrow" title="Carlito (like Calibri) — narrow letters, more words per line"><span class="gptpdf-sw-aa" style="font-family:Carlito,Calibri,sans-serif">Aa</span>Narrow</button>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Size</span>
                  <div class="gptpdf-sw-step" title="Text size in points. Headings, tables and code follow it">
                    <button id="gptpdf-look-size-dn" aria-label="Smaller">&minus;</button><output id="gptpdf-look-size">11 pt</output><button id="gptpdf-look-size-up" aria-label="Larger">+</button>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Spacing</span>
                  <div class="gptpdf-segment" id="gptpdf-look-spacing">
                    <button class="gptpdf-seg-btn" data-value="tight" title="Tight — lines close together"><svg width="22" height="18" viewBox="0 0 22 18"><path d="M3 5h16M3 8h16M3 11h16M3 14h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
                    <button class="gptpdf-seg-btn" data-value="normal" title="Normal — easy to read"><svg width="22" height="18" viewBox="0 0 22 18"><path d="M3 3.5h16M3 7.5h16M3 11.5h16M3 15.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
                    <button class="gptpdf-seg-btn" data-value="airy" title="Airy — room between lines"><svg width="22" height="18" viewBox="0 0 22 18"><path d="M3 2.5h16M3 7.5h16M3 12.5h16M3 17h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Questions</span>
                  <div class="gptpdf-segment" id="gptpdf-q-look">
                    <button class="gptpdf-seg-btn" data-value="bubble" title="A bubble on the right — like in ChatGPT"><svg width="30" height="18" viewBox="0 0 30 18"><rect x="11" y="2" width="17" height="7" rx="3.5" fill="currentColor" opacity=".55"/><path d="M2 12.5h26M2 16h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".55"/></svg>Bubble</button>
                    <button class="gptpdf-seg-btn" data-value="heading" title="A bold line across the page — like a report"><svg width="30" height="18" viewBox="0 0 30 18"><path d="M2 4.5h20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M2 11h26M2 15h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".55"/></svg>Heading</button>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Question colour</span>
                  <div class="gptpdf-sw-colors" id="gptpdf-q-colors"></div>
                </div>
              </div>

              <div class="gptpdf-sw-pane" data-pane="paper">
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Size</span>
                  <div style="display:flex;gap:8px">
                    <div class="gptpdf-segment" id="gptpdf-page-size">
                      <button class="gptpdf-seg-btn" data-value="a4" title="210 × 297 mm">A4</button>
                      <button class="gptpdf-seg-btn" data-value="letter" title="8.5 × 11 in — USA, Canada, Mexico">Letter</button>
                    </div>
                    <div class="gptpdf-segment" id="gptpdf-orientation">
                      <button class="gptpdf-seg-btn" data-value="" title="Portrait">&#x2195;</button>
                      <button class="gptpdf-seg-btn" data-value="landscape" title="Landscape — two columns, wide tables fit better">&#x2194;</button>
                    </div>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Sheet</span>
                  <div class="gptpdf-theme-cards gptpdf-sw-sheets" id="gptpdf-theme">
                    <button class="gptpdf-theme-card active" data-value="light" title="White sheet, dark text. Prints well">
                      <div class="gptpdf-theme-mini-doc light">
                        <div class="gptpdf-mini-line w100"></div><div class="gptpdf-mini-line w75"></div><div class="gptpdf-mini-line w50"></div>
                      </div><span>Light<small>to print</small></span>
                    </button>
                    <button class="gptpdf-theme-card" data-value="dark" title="Dark sheet, light text — for reading on a phone or tablet. Prints badly">
                      <div class="gptpdf-theme-mini-doc dark">
                        <div class="gptpdf-mini-line w100 on-dark"></div><div class="gptpdf-mini-line w75 on-dark"></div><div class="gptpdf-mini-line w50 on-dark"></div>
                      </div><span>Dark<small>to read on screen</small></span>
                    </button>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Margins</span>
                  <div class="gptpdf-segment" id="gptpdf-margins">
                    <button class="gptpdf-seg-btn" data-value="" title="20 mm at the sides, 18 mm top and bottom">Normal</button>
                    <button class="gptpdf-seg-btn" data-value="narrow" title="10 mm all round — more text per page">Narrow</button>
                    <button class="gptpdf-seg-btn" data-value="minimal" title="2.5 mm — almost to the edge; printers may cut it">Minimal</button>
                    <button class="gptpdf-seg-btn" data-value="custom" title="Set each margin yourself">Custom</button>
                  </div>
                </div>
                <div class="gptpdf-sw-custom" id="gptpdf-margins-custom">
                  <label>Top<input id="gptpdf-margin-top" data-k="margin_top" type="number" min="0" max="60" step="1"></label>
                  <label>Right<input id="gptpdf-margin-right" data-k="margin_right" type="number" min="0" max="60" step="1"></label>
                  <label>Bottom<input id="gptpdf-margin-bottom" data-k="margin_bottom" type="number" min="0" max="60" step="1"></label>
                  <label>Left<input id="gptpdf-margin-left" data-k="margin_left" type="number" min="0" max="60" step="1"></label>
                  <label style="justify-content:flex-end;padding-bottom:7px">mm</label>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Page breaks</span>
                  <div class="gptpdf-segment" id="gptpdf-page-break">
                    <button class="gptpdf-seg-btn" data-value="" title="Pages fill up as the text runs">Auto</button>
                    <button class="gptpdf-seg-btn" data-value="after" title="Every question starts on a new page">Each question</button>
                    <button class="gptpdf-seg-btn" data-value="long" title="The whole chat on one long page — for reading on screen; no page numbers">One long page</button>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Page numbers <small id="gptpdf-page-numbers-hint"></small></span>
                  <label class="gptpdf-toggle" title="&#8220;1 / 2&#8221; at the bottom of each page">
                    <input type="checkbox" id="gptpdf-page-numbers"><span class="gptpdf-toggle-track"></span>
                  </label>
                </div>
              </div>

              <div class="gptpdf-sw-pane" data-pane="header">
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Title</span>
                  <div class="gptpdf-segment" id="gptpdf-title-mode">
                    <button class="gptpdf-seg-btn" data-value="" title="The chat's name, at the top and in the file name">Chat name</button>
                    <button class="gptpdf-seg-btn" data-value="ask" title="You type the title on each export">Ask me</button>
                    <button class="gptpdf-seg-btn" data-value="none" title="No title">None</button>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Export date</span>
                  <div class="gptpdf-segment" id="gptpdf-datetime">
                    <button class="gptpdf-seg-btn" data-value="none">None</button>
                    <button class="gptpdf-seg-btn" data-value="date_only" title="The day you export, not the day of the chat">Date</button>
                    <button class="gptpdf-seg-btn" data-value="full" title="Day and time of the export">Date &amp; time</button>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Contents</span>
                  <div class="gptpdf-segment" id="gptpdf-toc">
                    <button class="gptpdf-seg-btn" data-value="">None</button>
                    <button class="gptpdf-seg-btn" data-value="basic" title="Your questions as a clickable list; also bookmarks in the PDF reader">List</button>
                    <button class="gptpdf-seg-btn" data-value="numbering" title="The same list with numbers 1, 2, 3">Numbered</button>
                  </div>
                </div>
                <div class="gptpdf-sw-row">
                  <span class="gptpdf-sw-lb">Link to the chat</span>
                  <label class="gptpdf-toggle" title="A link back to this chat under the title">
                    <input type="checkbox" id="gptpdf-source-link"><span class="gptpdf-toggle-track"></span>
                  </label>
                </div>
              </div>

            </div>
          </div>
        </div>
        <div id="gptpdf-settings-footer">
          <span class="gptpdf-sw-ver" id="gptpdf-sw-ver"></span>
          <button class="gptpdf-btn-reset" id="gptpdf-settings-reset" title="Back to the Chat style and the standard paper and header">Reset to defaults</button>
          <button class="gptpdf-btn-apply" id="gptpdf-settings-done">Done</button>
        </div>
      </div>
    </div>
`;
