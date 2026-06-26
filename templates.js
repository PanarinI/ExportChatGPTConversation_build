'use strict';

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
 html.dark .gptpdf-no-chat-tooltip {
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

 #gptpdf-convert-main {
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

html.dark #gptpdf-convert-main:hover #gptpdf-btn-left,
html.dark #gptpdf-convert-main:hover #gptpdf-more {
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

 html.dark #gptpdf-more:hover {
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

html.dark #gptpdf-extra-btns {
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

html.dark .gptpdf-active {
    background: rgba(234,76,58,0.18) !important;
}

html.dark .gptpdf-active .gptpdf-menu-icon,
html.dark .gptpdf-active .gptpdf-menu-title {
    color: #ff9b8f !important;
}

.gptpdf-extra-btn:hover {
    background: rgba(0,0,0,0.05);
}

html.dark .gptpdf-extra-btn:hover {
    background: rgba(255,255,255,0.06);
}

.gptpdf-divider {
    height: 1px;

    margin: 6px 4px;

    background: rgba(0,0,0,0.08);
}

html.dark .gptpdf-divider {
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

html.dark .gptpdf-extra-btn {
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

html.dark .gptpdf-menu-icon {
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

html.dark .gptpdf-menu-title {
    color: rgba(255,255,255,0.92);
}

.gptpdf-menu-desc {
    font-size: 12px;
    color: rgba(0,0,0,0.4);
    line-height: 1.3;
    margin-top: 2px;
}

html.dark .gptpdf-menu-desc {
    color: rgba(255,255,255,0.38);
}

.gptpdf-menu-arrow {
    font-size: 18px;
    color: rgba(0,0,0,0.25);
    flex-shrink: 0;
    line-height: 1;
}

html.dark .gptpdf-menu-arrow {
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
html.dark #gptpdf-rateus-dropdown {
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
html.dark #gptpdf-rateus-dropdown .gptpdf-dropdown-label {
    color: rgba(255,255,255,0.4);
}
#gptpdf-rateus-dropdown .gptpdf-stars { gap: 4px; }
#gptpdf-rateus-dropdown .gptpdf-star  { font-size: 22px; }

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
 html.dark #gptpdf-blocks-bar {
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
 html.dark #gptpdf-blocks-cancel { border-color: #555; }

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
     background: rgba(234,76,58,0.05);
     outline: 2px solid rgba(234,76,58,0.25);
 }
 .gptpdf-block-sel.gptpdf-block-checked {
     background: rgba(234,76,58,0.07);
     outline: 2px solid #EA4C3A;
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
 html.dark .gptpdf-block-cb {
     background: rgba(40,40,40,0.85);
 }
 .gptpdf-block-cb input[type=checkbox] {
     width: 18px;
     height: 18px;
     pointer-events: auto;
     accent-color: #EA4C3A;
     cursor: pointer;
     display: block;
 }

 /* Selection row for image blocks */
 .gptpdf-img-sel-row {
     display: flex;
     align-items: center;
     gap: 8px;
     padding: 6px 10px;
     border-radius: 8px 8px 0 0;
     background: rgba(234,76,58,0.07);
     border: 2px solid rgba(234,76,58,0.2);
     border-bottom: none;
     cursor: pointer;
     transition: background 0.12s;
 }
 .gptpdf-img-sel-row:hover {
     background: rgba(234,76,58,0.12);
 }
 .gptpdf-img-sel-row.gptpdf-img-sel-checked {
     background: rgba(234,76,58,0.15);
     border-color: #EA4C3A;
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
 html.dark .gptpdf-rate-row { border-top-color: rgba(255,255,255,0.08); color: #666; }
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
 html.dark .gptpdf-star { color: #444; }
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
     justify-content: center;
     align-items: center;
 }
 .gptpdf-loading-overlay.gptpdf-dark { background: rgba(0, 0, 0, 0.62); }
 .gptpdf-loading-card {
     display: flex;
     flex-direction: column;
     align-items: center;
     gap: 14px;
     min-width: 220px;
     padding: 28px 34px;
     background: #fff;
     color: #222;
     border-radius: 14px;
     box-shadow: 0 10px 34px rgba(0, 0, 0, 0.22);
     font-size: 15px;
 }
 .gptpdf-loading-overlay.gptpdf-dark .gptpdf-loading-card { background: #2a2a2a; color: #ededed; }
 .gptpdf-loading-text { font-weight: 500; width: 250px; min-height: 2.5em; display: flex; align-items: center; justify-content: center; text-align: center; }
 .gptpdf-loading-card .gptpdf-dots-loader span { width: 10px; height: 10px; }
 .gptpdf-loading-cancel {
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
 .gptpdf-loading-overlay.gptpdf-dark .gptpdf-loading-cancel { border-color: rgba(255, 255, 255, 0.2); }
 .gptpdf-loading-overlay.gptpdf-dark .gptpdf-loading-cancel:hover { background: rgba(255, 255, 255, 0.1); }
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
 html.dark #gptpdf-title {
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
 html.dark #gptpdf-title-dialog {
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
 html.dark #gptpdf-title-dialog-header {
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
 html.dark #gptpdf-title-close-btn { color: rgba(255,255,255,0.4); }
 html.dark #gptpdf-title-close-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
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
 html.dark #gptpdf-title-cancel-btn { background: rgba(255,255,255,0.08); }
 html.dark #gptpdf-title-cancel-btn:hover { background: rgba(255,255,255,0.13); }

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
html.dark #gptpdf-settings-modal {
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
html.dark #gptpdf-settings-header { border-bottom-color: rgba(255,255,255,0.08); }

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
html.dark #gptpdf-settings-close { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
html.dark #gptpdf-settings-close:hover { background: rgba(255,255,255,0.15); }

#gptpdf-settings-body { display: flex; flex: 1; overflow: hidden; }

#gptpdf-settings-form {
    flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
}

#gptpdf-settings-preview-col {
    width: 196px; flex-shrink: 0; padding: 14px 14px 14px 0;
    display: flex; flex-direction: column; align-items: center;
    border-left: 1px solid rgba(0,0,0,0.06);
}
html.dark #gptpdf-settings-preview-col { border-left-color: rgba(255,255,255,0.06); }

#gptpdf-settings-footer {
    display: flex; align-items: center; justify-content: flex-end;
    gap: 8px; padding: 12px 20px;
    border-top: 1px solid rgba(0,0,0,0.08); flex-shrink: 0;
}
html.dark #gptpdf-settings-footer { border-top-color: rgba(255,255,255,0.08); }

.gptpdf-section {
    background: #fff; border-radius: 14px; padding: 12px 14px;
    display: flex; flex-direction: column; gap: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
html.dark .gptpdf-section { background: rgba(255,255,255,0.05); }

.gptpdf-section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.09em; color: rgba(0,0,0,0.38); margin-bottom: -2px;
}
html.dark .gptpdf-section-title { color: rgba(255,255,255,0.32); }

.gptpdf-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; min-height: 30px;
}
.gptpdf-label { font-size: 13px; font-weight: 500; color: rgba(0,0,0,0.75); flex-shrink: 0; }
html.dark .gptpdf-label { color: rgba(255,255,255,0.8); }

.gptpdf-segment {
    display: flex; background: rgba(0,0,0,0.06);
    border-radius: 9px; padding: 2px; gap: 1px;
}
html.dark .gptpdf-segment { background: rgba(255,255,255,0.08); }

.gptpdf-seg-btn {
    flex: 1; padding: 4px 9px; border: none; border-radius: 7px;
    background: transparent; font-size: 12px; font-weight: 500;
    color: rgba(0,0,0,0.45); cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
html.dark .gptpdf-seg-btn { color: rgba(255,255,255,0.4); }
.gptpdf-seg-btn.active {
    background: #fff; color: rgba(0,0,0,0.85);
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}
html.dark .gptpdf-seg-btn.active { background: rgba(255,255,255,0.18); color: rgba(255,255,255,0.92); }

.gptpdf-toggle { position: relative; display: inline-block; width: 38px; height: 22px; cursor: pointer; flex-shrink: 0; }
.gptpdf-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.gptpdf-toggle-track {
    position: absolute; inset: 0; border-radius: 11px;
    background: rgba(0,0,0,0.15); transition: background 0.2s;
}
html.dark .gptpdf-toggle-track { background: rgba(255,255,255,0.2); }
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
html.dark .gptpdf-slider { background: rgba(255,255,255,0.15); }
.gptpdf-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
    background: #EA4C3A; cursor: pointer; box-shadow: 0 1px 4px rgba(234,76,58,0.4);
}
.gptpdf-slider-value { font-size: 12px; font-weight: 600; color: rgba(0,0,0,0.5); min-width: 32px; text-align: right; }
html.dark .gptpdf-slider-value { color: rgba(255,255,255,0.5); }

.gptpdf-swatches { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
.gptpdf-swatch {
    height: 26px; padding: 0 9px; border-radius: 7px;
    border: 1.5px solid transparent; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
    background: rgba(0,0,0,0.06); color: rgba(0,0,0,0.55);
}
html.dark .gptpdf-swatch { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
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
html.dark .gptpdf-theme-card { border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.45); }
.gptpdf-theme-card.active { border-color: #EA4C3A !important; color: #EA4C3A !important; background: rgba(234,76,58,0.09) !important; box-shadow: 0 0 0 1px rgba(234,76,58,0.3); }
html.dark .gptpdf-theme-card.active { color: #ff9b8f !important; }
.gptpdf-theme-mini-doc {
    width: 44px; height: 56px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);
    padding: 5px 4px; gap: 3px; display: flex; flex-direction: column;
}
.gptpdf-theme-mini-doc.light { background: #fff; }
.gptpdf-theme-mini-doc.dark { background: #333; border-color: rgba(255,255,255,0.1); }
.gptpdf-theme-mini-doc.auto-doc { background: linear-gradient(135deg, #fff 50%, #333 50%); }
.gptpdf-mini-line { height: 3px; border-radius: 2px; background: rgba(0,0,0,0.18); }
.gptpdf-mini-line.on-dark { background: rgba(255,255,255,0.3); }
.gptpdf-mini-line.w100 { width: 100%; }
.gptpdf-mini-line.w75 { width: 75%; }
.gptpdf-mini-line.w50 { width: 50%; }

.gptpdf-sub-section {
    flex-direction: column; gap: 8px; padding-top: 10px;
    border-top: 1px solid rgba(0,0,0,0.06); margin-top: 2px;
}
html.dark .gptpdf-sub-section { border-top-color: rgba(255,255,255,0.06); }
.gptpdf-margins-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.gptpdf-margin-field { display: flex; flex-direction: column; gap: 3px; }
.gptpdf-margin-field label { font-size: 11px; color: rgba(0,0,0,0.4); font-weight: 500; }
html.dark .gptpdf-margin-field label { color: rgba(255,255,255,0.35); }
.gptpdf-margin-input {
    width: 100%; padding: 5px 8px; border: 1px solid rgba(0,0,0,0.12); border-radius: 7px;
    font-size: 12px; background: rgba(0,0,0,0.03); color: inherit; outline: none; box-sizing: border-box;
}
html.dark .gptpdf-margin-input { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); }
.gptpdf-margin-input:focus { border-color: #EA4C3A; }

.gptpdf-btn-reset {
    padding: 7px 14px; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 10px;
    background: transparent; font-size: 13px; font-weight: 500; color: rgba(0,0,0,0.5); cursor: pointer; transition: all 0.15s;
}
html.dark .gptpdf-btn-reset { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.45); }
.gptpdf-btn-reset:hover { background: rgba(0,0,0,0.05); }
html.dark .gptpdf-btn-reset:hover { background: rgba(255,255,255,0.05); }

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
html.dark #gptpdf-preview-label { color: rgba(255,255,255,0.28); }

#gptpdf-preview-doc {
    width: 152px; border-radius: 8px; padding: 12px 10px;
    display: flex; flex-direction: column; gap: 7px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15); transition: background 0.3s; overflow: hidden;
    position: relative;
}
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
`;

// Floating Export button + dropdown markup. Interpolates gptpdfShared.version
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
    </div>
    <div id="gptpdf-no-chat-tooltip" class="gptpdf-no-chat-tooltip">
        Open a conversation first — then click Export
    </div>
    <button id="gptpdf-exit-select" title="Exit selection mode"
        style="display:none;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(0,0,0,0.2);background:white;cursor:pointer;font-size:13px;line-height:1;color:#555;margin-left:4px;flex-shrink:0">&#x2715;</button>

    <div id="gptpdf-extra-btns" class="gptpdf-hidden gptpdf-text-left">

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

        <div class="gptpdf-divider"></div>

        <a
            id="gptpdf-options"
            href="#"
            class="gptpdf-extra-btn">
            <span class="gptpdf-menu-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="9" r="2.2"/>
                    <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4"/>
                </svg>
            </span>
            <span class="gptpdf-menu-text">
                <span class="gptpdf-menu-title">Settings</span>
            </span>
            <span class="gptpdf-menu-arrow">›</span>
        </a>

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

    <div id="gptpdf-blocks-bar">
        <span id="gptpdf-blocks-count">0 blocks selected</span>
        <button id="gptpdf-blocks-export">Export selected</button>
        <button id="gptpdf-blocks-cancel">Cancel</button>
    </div>

    <div class="gptpdf-loading-overlay" id="gptpdf-loading-overlay">
        <div class="gptpdf-loading-card">
            <div class="gptpdf-dots-loader"><span></span><span></span><span></span></div>
            <div class="gptpdf-loading-text">Loading conversation...</div>
            <button id="gptpdf-cancel-loading" class="gptpdf-loading-cancel">Cancel</button>
        </div>
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
      <div id="gptpdf-settings-modal">
        <div id="gptpdf-settings-header">
          <h2>Settings</h2>
          <button id="gptpdf-settings-close">✕</button>
        </div>
        <div id="gptpdf-settings-body">
          <div id="gptpdf-settings-form">

            <div class="gptpdf-section">
              <div class="gptpdf-section-title">Output Format</div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Single page</span>
                <label class="gptpdf-toggle"><input type="checkbox" id="gptpdf-singlepage-toggle"><span class="gptpdf-toggle-track"></span></label>
              </div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Page size</span>
                <div style="display:flex;gap:8px;align-items:center;">
                  <div class="gptpdf-segment" id="gptpdf-page-size">
                    <button class="gptpdf-seg-btn active" data-value="a4">A4</button>
                    <button class="gptpdf-seg-btn" data-value="a5">A5</button>
                  </div>
                  <div class="gptpdf-segment" id="gptpdf-orientation">
                    <button class="gptpdf-seg-btn active" data-value="">↕</button>
                    <button class="gptpdf-seg-btn" data-value="landscape">↔</button>
                  </div>
                </div>
              </div>
              <div class="gptpdf-row" style="align-items:flex-start;flex-direction:column;gap:7px;">
                <span class="gptpdf-label">Color theme</span>
                <div class="gptpdf-theme-cards" id="gptpdf-theme">
                  <button class="gptpdf-theme-card active" data-value="">
                    <div class="gptpdf-theme-mini-doc auto-doc">
                      <div class="gptpdf-mini-line w100"></div><div class="gptpdf-mini-line w75"></div><div class="gptpdf-mini-line w50"></div>
                    </div>Auto
                  </button>
                  <button class="gptpdf-theme-card" data-value="light">
                    <div class="gptpdf-theme-mini-doc light">
                      <div class="gptpdf-mini-line w100"></div><div class="gptpdf-mini-line w75"></div><div class="gptpdf-mini-line w50"></div>
                    </div>Light
                  </button>
                  <button class="gptpdf-theme-card" data-value="dark">
                    <div class="gptpdf-theme-mini-doc dark">
                      <div class="gptpdf-mini-line w100 on-dark"></div><div class="gptpdf-mini-line w75 on-dark"></div><div class="gptpdf-mini-line w50 on-dark"></div>
                    </div>Dark
                  </button>
                </div>
              </div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Font size</span>
                <div class="gptpdf-slider-row">
                  <input type="range" class="gptpdf-slider" id="gptpdf-zoom" min="70" max="200" step="5" value="100">
                  <span class="gptpdf-slider-value" id="gptpdf-zoom-value">100%</span>
                </div>
              </div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Margins</span>
                <div class="gptpdf-segment" id="gptpdf-margins">
                  <button class="gptpdf-seg-btn active" data-value="">Default</button>
                  <button class="gptpdf-seg-btn" data-value="minimal">Minimal</button>
                  <button class="gptpdf-seg-btn" data-value="custom">Custom</button>
                </div>
              </div>
              <div class="gptpdf-sub-section" id="gptpdf-margins-custom" style="display:none;">
                <div class="gptpdf-margins-grid">
                  <div class="gptpdf-margin-field"><label>Top</label><input type="text" class="gptpdf-margin-input" id="gptpdf-margin-top" value="0.4in"></div>
                  <div class="gptpdf-margin-field"><label>Bottom</label><input type="text" class="gptpdf-margin-input" id="gptpdf-margin-bottom" value="0.4in"></div>
                  <div class="gptpdf-margin-field"><label>Left</label><input type="text" class="gptpdf-margin-input" id="gptpdf-margin-left" value="0.4in"></div>
                  <div class="gptpdf-margin-field"><label>Right</label><input type="text" class="gptpdf-margin-input" id="gptpdf-margin-right" value="0.4in"></div>
                </div>
              </div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Page breaks</span>
                <div class="gptpdf-segment" id="gptpdf-page-break">
                  <button class="gptpdf-seg-btn active" data-value="">Auto</button>
                  <button class="gptpdf-seg-btn" data-value="after">After each answer</button>
                </div>
              </div>
            </div>

            <div class="gptpdf-section">
              <div class="gptpdf-section-title">Theme</div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Style</span>
                <input type="hidden" id="gptpdf-q-color-value" value="default">
                <div id="gptpdf-q-palette" style="display:flex;flex-wrap:wrap;gap:5px;max-width:240px;">
                </div>
              </div>
            </div>

            <div class="gptpdf-section">
              <div class="gptpdf-section-title">Document Info</div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">PDF Title</span>
                <div class="gptpdf-segment" id="gptpdf-title-mode">
                  <button class="gptpdf-seg-btn active" data-value="">Chat name</button>
                  <button class="gptpdf-seg-btn" data-value="ask">Ask me</button>
                  <button class="gptpdf-seg-btn" data-value="none">None</button>
                </div>
              </div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Creation date</span>
                <div class="gptpdf-segment" id="gptpdf-datetime">
                  <button class="gptpdf-seg-btn" data-value="none">None</button>
                  <button class="gptpdf-seg-btn active" data-value="date_only">Date</button>
                  <button class="gptpdf-seg-btn" data-value="full">Date & time</button>
                </div>
              </div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Table of contents</span>
                <div class="gptpdf-segment" id="gptpdf-toc">
                  <button class="gptpdf-seg-btn" data-value="">None</button>
                  <button class="gptpdf-seg-btn active" data-value="basic">Standard</button>
                  <button class="gptpdf-seg-btn" data-value="numbering">Numbered</button>
                </div>
              </div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Include model name</span>
                <label class="gptpdf-toggle"><input type="checkbox" id="gptpdf-model-name"><span class="gptpdf-toggle-track"></span></label>
              </div>
              <div class="gptpdf-row">
                <span class="gptpdf-label">Source link</span>
                <label class="gptpdf-toggle"><input type="checkbox" id="gptpdf-source-link" checked><span class="gptpdf-toggle-track"></span></label>
              </div>
            </div>

          </div>
          <div id="gptpdf-settings-preview-col">
            <div id="gptpdf-preview-label">Preview</div>
            <div id="gptpdf-preview-doc" class="preview-light">
              <div class="gptpdf-prev-title"></div>
              <div class="gptpdf-prev-date" style="display:none;height:2px;width:50%;border-radius:2px;margin-bottom:2px;"></div>
              <!-- model + source link: absolutely positioned top-right corner -->
              <div id="gptpdf-prev-meta" style="position:absolute;top:8px;right:8px;display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
                <div class="gptpdf-prev-model" style="display:none;height:2px;width:22px;border-radius:1px;"></div>
                <div class="gptpdf-prev-source" style="display:none;height:2px;width:30px;border-radius:1px;opacity:0.6;"></div>
              </div>
              <div class="gptpdf-prev-toc" style="display:none;flex-direction:column;gap:3px;padding:4px 0 5px;">
                <div style="display:flex;align-items:center;gap:2px;">
                  <div class="gptpdf-toc-dot" style="width:3px;height:3px;border-radius:50%;background:rgba(74,144,217,0.9);flex-shrink:0;"></div>
                  <div class="gptpdf-toc-line" style="height:2px;width:78%;background:rgba(74,144,217,0.6);border-radius:1px;"></div>
                  <div class="gptpdf-toc-pg" style="width:4px;height:2px;background:rgba(74,144,217,0.4);border-radius:1px;margin-left:auto;"></div>
                </div>
                <div style="display:flex;align-items:center;gap:2px;padding-left:6px;">
                  <div class="gptpdf-toc-dot" style="width:2px;height:2px;border-radius:50%;background:rgba(74,144,217,0.65);flex-shrink:0;"></div>
                  <div class="gptpdf-toc-line" style="height:2px;width:60%;background:rgba(74,144,217,0.42);border-radius:1px;"></div>
                  <div class="gptpdf-toc-pg" style="width:4px;height:2px;background:rgba(74,144,217,0.3);border-radius:1px;margin-left:auto;"></div>
                </div>
                <div style="display:flex;align-items:center;gap:2px;padding-left:6px;">
                  <div class="gptpdf-toc-dot" style="width:2px;height:2px;border-radius:50%;background:rgba(74,144,217,0.65);flex-shrink:0;"></div>
                  <div class="gptpdf-toc-line" style="height:2px;width:50%;background:rgba(74,144,217,0.42);border-radius:1px;"></div>
                  <div class="gptpdf-toc-pg" style="width:4px;height:2px;background:rgba(74,144,217,0.3);border-radius:1px;margin-left:auto;"></div>
                </div>
              </div>
              <div style="display:flex;align-items:flex-start;gap:4px;">
                <div class="gptpdf-prev-avatar" style="width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,0.22);flex-shrink:0;margin-top:4px;"></div>
                <div class="gptpdf-prev-user" id="gptpdf-prev-user-1" style="flex:1;">
                  <div class="gptpdf-prev-line w80"></div>
                  <div class="gptpdf-prev-line w60"></div>
                </div>
              </div>
              <div class="gptpdf-prev-ai">
                <div class="gptpdf-prev-line w90"></div>
                <div class="gptpdf-prev-line w80"></div>
                <div class="gptpdf-prev-line w60"></div>
              </div>
              <div style="display:flex;align-items:stretch;gap:3px;padding:1px 0;">
                <div class="gptpdf-prev-bq-bar" style="width:2px;background:#d0d0d0;border-radius:1px;flex-shrink:0;"></div>
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
                  <div class="gptpdf-prev-line w80"></div>
                  <div class="gptpdf-prev-line w55"></div>
                </div>
              </div>
              <div class="gptpdf-prev-break" id="gptpdf-prev-break" style="display:none;"></div>
              <div style="display:flex;align-items:flex-start;gap:4px;">
                <div class="gptpdf-prev-avatar" style="width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,0.22);flex-shrink:0;margin-top:4px;"></div>
                <div class="gptpdf-prev-user" id="gptpdf-prev-user-2" style="flex:1;">
                  <div class="gptpdf-prev-line w60"></div>
                </div>
              </div>
              <div class="gptpdf-prev-ai">
                <div class="gptpdf-prev-line w90"></div>
                <div class="gptpdf-prev-line w40"></div>
              </div>

            </div>
          </div>
        </div>
        <div id="gptpdf-settings-footer">
          <span class="gptpdf-saved-note" id="gptpdf-saved-note">✓ Saved</span>
          <button class="gptpdf-btn-reset" id="gptpdf-settings-reset">Reset to defaults</button>
          <button class="gptpdf-btn-apply" id="gptpdf-settings-apply">Apply Changes</button>
        </div>
      </div>
    </div>
`;
