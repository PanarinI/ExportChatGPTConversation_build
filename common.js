'use strict';

const pdfcrowdChatGPT = {};

pdfcrowdChatGPT.pdfcrowdAPI = 'https://api.pdfcrowd.com/convert/24.04/';
pdfcrowdChatGPT.username = 'EgorFanar'; // chat-gpt -- EgorFanar
pdfcrowdChatGPT.apiKey = '81c872c903db8eccc84d622e3eb2966a'; // 29d211b1f6924c22b7a799b4e8fecb7e - chat-gpt -- 81c872c903db8eccc84d622e3eb2966a - EgorFanar

pdfcrowdChatGPT.init = function() {
    if(document.querySelectorAll('.pdfcrowd-convert').length > 0) {
        // avoid double init
        return;
    }

    // remote images live at least 1 minute
    const minImageDuration = 60000;

    const buttonIconFill = (typeof GM_xmlhttpRequest !== 'undefined')
        ? '#A72C16' : '#EA4C3A';

    const blockStyle = document.createElement('style');
    blockStyle.textContent = `
 .pdfcrowd-block {
     position: fixed;
     height: 36px;
     top: 10px;
     right: 180px;
 }

 /* ── Welcome-hint ripple rings ───────────────────────────── */
 @keyframes pdfcrowdRing {
     0%   { transform: scale(0.88); opacity: 0; }
     15%  { opacity: 1; }
     100% { transform: scale(1.6);  opacity: 0; }
 }
 .pdfcrowd-ring {
     position: absolute;
     inset: -10px;
     border-radius: 14px;
     border: 2px solid rgba(234,76,58,0.35);
     animation: pdfcrowdRing 2.8s ease-out infinite;
     pointer-events: none;
 }
 .pdfcrowd-ring:nth-child(2) { animation-delay: 0.9s; }
 .pdfcrowd-ring:nth-child(3) { animation-delay: 1.8s; }

 /* ── No-chat (home page) state ───────────────────────────── */
 .pdfcrowd-no-chat {
     opacity: 0.45;
     cursor: default;
 }
 .pdfcrowd-no-chat:hover {
     opacity: 0.55;
 }
 .pdfcrowd-no-chat-tooltip {
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
 html.dark .pdfcrowd-no-chat-tooltip {
     background: rgba(60,60,60,0.96);
 }
 .pdfcrowd-no-chat-tooltip.pdfcrowd-tooltip-visible {
     opacity: 1;
 }

 @media (max-width: 767px) {
     .pdfcrowd-lg {
         display: none;
     }

     .pdfcrowd-sm {
         display: block;
     }
 }

 .pdfcrowd-lg {
     display: block;
 }

 .pdfcrowd-sm {
     display: none;
 }

 .pdfcrowd-btn-smaller .pdfcrowd-lg {
     display: none;
 }

 .pdfcrowd-btn-smaller .pdfcrowd-sm {
     display: block;
 }

 .pdfcrowd-btn-smallest .pdfcrowd-lg, .pdfcrowd-btn-smallest .pdfcrowd-sm {
     display: none;
 }

 .pdfcrowd-btn-xs-small .pdfcrowd-lg, .pdfcrowd-btn-xs-small .pdfcrowd-sm {
     display: none;
 }

 .pdfcrowd-btn-xs-small .btn-small {
     background: none;
     border: none;
 }

 .pdfcrowd-btn-xs-small svg {
     margin: 0;
 }

 svg.pdfcrowd-btn-content {

     width: 1rem;
     height: 1rem;
 }

 #pdfcrowd-convert-main svg {
color: #EA4C3A;
}

 #pdfcrowd-convert-main {
     padding: 0;
     border-radius: 12px;
    background: transparent;
    border: none;
 }

#pdfcrowd-btn-left {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 0.5rem;
    border-radius: 10px 0 0 10px;
    transition: background 0.15s ease;
}

#pdfcrowd-convert-main:hover #pdfcrowd-btn-left,
#pdfcrowd-convert-main:hover #pdfcrowd-more {
    background: rgba(0,0,0,0.06);
}

html.dark #pdfcrowd-convert-main:hover #pdfcrowd-btn-left,
html.dark #pdfcrowd-convert-main:hover #pdfcrowd-more {
    background: rgba(255,255,255,0.1);
}

 #pdfcrowd-convert-main:disabled {
     cursor: wait;
     filter: none;
     opacity: 1;
 }

 .pdfcrowd-dropdown-arrow::after {
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

#pdfcrowd-convert-main:hover
.pdfcrowd-dropdown-arrow::after {
    opacity: 0.9;
}
 .pdfcrowd-fs-small {
     font-size: 14px;
     line-height: 1.25rem;
 }

 #pdfcrowd-more {
     cursor: pointer;
     padding: .5rem;
     border-top-right-radius: 10px;
     border-bottom-right-radius: 10px;
     border-left: 1px solid rgba(128,128,128,0.35);
     margin-left: 4px;
     transition: background 0.15s ease;
 }

 #pdfcrowd-more:hover {
     background-color: rgba(0,0,0,0.06);
 }

 html.dark #pdfcrowd-more:hover {
     background-color: rgba(255,255,255,0.1);
 }

 #pdfcrowd-convert-main:not(:hover) #pdfcrowd-more:not(:hover) {
     background: transparent;
 }

#pdfcrowd-extra-btns {
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

html.dark #pdfcrowd-extra-btns {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(32, 33, 35, 0.96);
    color: rgba(255,255,255,0.92);
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
}

.pdfcrowd-active .pdfcrowd-menu-icon,
.pdfcrowd-active .pdfcrowd-menu-title {
    color: #EA4C3A !important;
}

.pdfcrowd-active {
    background: rgba(234,76,58,0.08) !important;
}

html.dark .pdfcrowd-active {
    background: rgba(234,76,58,0.18) !important;
}

html.dark .pdfcrowd-active .pdfcrowd-menu-icon,
html.dark .pdfcrowd-active .pdfcrowd-menu-title {
    color: #ff9b8f !important;
}

.pdfcrowd-extra-btn:hover {
    background: rgba(0,0,0,0.05);
}

html.dark .pdfcrowd-extra-btn:hover {
    background: rgba(255,255,255,0.06);
}

.pdfcrowd-divider {
    height: 1px;

    margin: 6px 4px;

    background: rgba(0,0,0,0.08);
}

html.dark .pdfcrowd-divider {
    background: rgba(255,255,255,0.08);
}

.pdfcrowd-extra-btn {
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

html.dark .pdfcrowd-extra-btn {
    color: rgba(255,255,255,0.92);
}

.pdfcrowd-menu-icon {
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

html.dark .pdfcrowd-menu-icon {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.65);
}

.pdfcrowd-menu-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.pdfcrowd-menu-title {
    font-size: 14px;
    font-weight: 500;
    color: rgba(0,0,0,0.85);
    line-height: 1.3;
}

html.dark .pdfcrowd-menu-title {
    color: rgba(255,255,255,0.92);
}

.pdfcrowd-menu-desc {
    font-size: 12px;
    color: rgba(0,0,0,0.4);
    line-height: 1.3;
    margin-top: 2px;
}

html.dark .pdfcrowd-menu-desc {
    color: rgba(255,255,255,0.38);
}

.pdfcrowd-menu-arrow {
    font-size: 18px;
    color: rgba(0,0,0,0.25);
    flex-shrink: 0;
    line-height: 1;
}

html.dark .pdfcrowd-menu-arrow {
    color: rgba(255,255,255,0.25);
}

 .pdfcrowd-hidden {
     display: none;
 }

 #pdfcrowd-spinner {
     position: absolute;
     width: 100%;
     height: 100%;
 }

 .pdfcrowd-spinner {
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
.pcr-dots-loader {
    display: flex;
    align-items: center;
    gap: 5px;
}
.pcr-dots-loader span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #EA4C3A;
    animation: pcrDotPulse 1.2s ease-in-out infinite;
}
.pcr-dots-loader span:nth-child(1) { animation-delay: 0s; }
.pcr-dots-loader span:nth-child(2) { animation-delay: 0.2s; }
.pcr-dots-loader span:nth-child(3) { animation-delay: 0.4s; }
@keyframes pcrDotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.25; }
    40%            { transform: scale(1.15); opacity: 1; }
}

/* ── Rate Us dropdown panel ─────────────────────────────── */
#pcr-rateus-dropdown {
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
html.dark #pcr-rateus-dropdown {
    background: rgba(32,33,35,0.97);
    border-color: rgba(255,255,255,0.08);
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    color: rgba(255,255,255,0.9);
}
#pcr-rateus-dropdown .pcr-dropdown-label {
    font-size: 11px;
    color: rgba(0,0,0,0.45);
    letter-spacing: 0.03em;
}
html.dark #pcr-rateus-dropdown .pcr-dropdown-label {
    color: rgba(255,255,255,0.4);
}
#pcr-rateus-dropdown .pdfcrowd-stars { gap: 4px; }
#pcr-rateus-dropdown .pdfcrowd-star  { font-size: 22px; }

 .pdfcrowd-invisible {
     visibility: hidden;
 }

 /* ── Block-selection mode ────────────────────────────────── */
 #pdfcrowd-blocks-bar {
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
 #pdfcrowd-blocks-bar.pdfcrowd-active { display: none; } /* replaced by main button */
 html.dark #pdfcrowd-blocks-bar {
     background: #2a2a2a;
     border-color: #444;
     color: #eee;
 }
 #pdfcrowd-blocks-count { font-weight: 500; min-width: 130px; }
 #pdfcrowd-blocks-export {
     background: #EA4C3A;
     color: #fff;
     border: none;
     border-radius: 8px;
     padding: 7px 16px;
     font-size: 14px;
     font-weight: 500;
     cursor: pointer;
 }
 #pdfcrowd-blocks-export:disabled { opacity: 0.45; cursor: default; }
 #pdfcrowd-blocks-cancel {
     background: none;
     color: inherit;
     border: 1px solid #ccc;
     border-radius: 8px;
     padding: 7px 14px;
     font-size: 14px;
     cursor: pointer;
 }
 html.dark #pdfcrowd-blocks-cancel { border-color: #555; }

 /* Individual content blocks */
 .pdfcrowd-block-sel {
     position: relative;
     border-radius: 6px;
     cursor: pointer;
     transition: background 0.12s, outline 0.12s;
     outline: 2px solid transparent;
     overflow: visible !important; /* ensure checkbox not clipped by overflow:hidden */
 }
 .pdfcrowd-block-sel:hover {
     background: rgba(234,76,58,0.05);
     outline: 2px solid rgba(234,76,58,0.25);
 }
 .pdfcrowd-block-sel.pdfcrowd-block-checked {
     background: rgba(234,76,58,0.07);
     outline: 2px solid #EA4C3A;
 }
 .pdfcrowd-block-cb {
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
 html.dark .pdfcrowd-block-cb {
     background: rgba(40,40,40,0.85);
 }
 .pdfcrowd-block-cb input[type=checkbox] {
     width: 18px;
     height: 18px;
     pointer-events: auto;
     accent-color: #EA4C3A;
     cursor: pointer;
     display: block;
 }

 /* Selection row for image blocks */
 .pdfcrowd-img-sel-row {
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
 .pdfcrowd-img-sel-row:hover {
     background: rgba(234,76,58,0.12);
 }
 .pdfcrowd-img-sel-row.pdfcrowd-img-sel-checked {
     background: rgba(234,76,58,0.15);
     border-color: #EA4C3A;
 }

 /* ── Rate us stars ──────────────────────────────────────── */
 .pdfcrowd-rate-row {
     display: flex;
     align-items: center;
     gap: 8px;
     padding: 10px 14px;
     font-size: 12px;
     color: #888;
     border-top: 1px solid rgba(0,0,0,0.07);
 }
 html.dark .pdfcrowd-rate-row { border-top-color: rgba(255,255,255,0.08); color: #666; }
 .pdfcrowd-stars {
     display: flex;
     gap: 2px;
     cursor: pointer;
 }
 .pdfcrowd-star {
     font-size: 16px;
     color: #ddd;
     transition: color 0.1s;
     line-height: 1;
     user-select: none;
 }
 html.dark .pdfcrowd-star { color: #444; }
 .pdfcrowd-star.filled { color: #EA4C3A; }
 /* CSS-only hover: all stars orange on hover, stars after hovered one go gray */
 .pdfcrowd-stars:hover .pdfcrowd-star { color: #EA4C3A !important; }
 .pdfcrowd-stars .pdfcrowd-star:hover ~ .pdfcrowd-star { color: #ddd !important; }

 .pdfcrowd-loading-overlay {
     z-index: 10001;
     display: none;
     position: fixed;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
     background: rgba(255, 255, 255, 0.96);
     color: #222;
     justify-content: center;
     align-items: center;
     flex-direction: column;
     gap: 1rem;
     font-size: 1rem;
 }

 .pdfcrowd-loading-overlay.pdfcrowd-dark {
     background: rgba(33, 33, 33, 0.96);
     color: #eee;
 }

 .pdfcrowd-loading-overlay .pdfcrowd-spinner {
     width: 2.5rem;
     height: 2.5rem;
     border-width: 5px;
 }

 .pdfcrowd-overlay {
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

 .pdfcrowd-dialog {
     background: #fff;
     padding: 0;
     margin: 0.5em;
     border-radius: 5px;
     box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
     text-align: start;
 }

 .pdfcrowd-dialog a {
     color: revert;
 }

 .pdfcrowd-dialog-body {
     padding: 0 2em;
     line-height: 2;
 }

 .pdfcrowd-dialog-footer {
     text-align: center;
     margin: .5em;
     position: relative;
 }

 .pdfcrowd-dialog-header {
     background-color: #eee;
     font-size: 1.25em;
     padding: .5em;
     border-top-left-radius: 10px;
     border-top-right-radius: 10px;
 }

 .pdfcrowd-help-content {
     max-width: 660px;
 }

 .pdfcrowd-version {
     position: absolute;
     bottom: 0;
     right: 0;
     font-size: .65em;
     color: #777;
 }

 .pdfcrowd-dialog ul {
     list-style: disc;
     margin: 0;
     padding: 0 0 0 2em;
 }

 .pdfcrowd-close-x {
     cursor: pointer;
     float: right;
     color: #777;
 }

 #pdfcrowd-help {
     cursor: pointer;
 }

 .pdfcrowd-py-1 {
     padding-bottom: 0.25rem;
     padding-top: 0.25rem;
 }

 .pdfcrowd-px-2 {
     padding-left: 0.5rem;
     padding-right: 0.5rem;
 }

 .pdfcrowd-mr-1 {
     margin-right: 0.25rem;
 }

 .pdfcrowd-mr-4 {
     margin-right: 1rem;
 }

 .pdfcrowd-justify-center {
     justify-content: center;
 }

 .pdfcrowd-items-center {
     align-items: center;
 }

 .pdfcrowd-flex {
     display: flex;
 }

 .pdfcrowd-text-left {
     text-align: left;
 }

 .pdfcrowd-text-right {
     text-align: right;
 }

 .pdfcrowd-h-9 {
     height: 2.25rem;
 }

 #pdfcrowd-title {
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
 #pdfcrowd-title:focus {
     border-color: #EA4C3A !important;
     box-shadow: 0 0 0 3px rgba(234,76,58,0.12) !important;
 }
 html.dark #pdfcrowd-title {
     background: #3a3a3a !important;
     border-color: rgba(255,255,255,0.18) !important;
     color: #e8e8e8 !important;
 }
 #pcr-title-dialog {
     background: #fff;
     border-radius: 16px;
     box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
     width: 360px;
     overflow: hidden;
     font-family: inherit;
 }
 html.dark #pcr-title-dialog {
     background: #2a2a2a;
     color: #e8e8e8;
 }
 #pcr-title-dialog-header {
     display: flex;
     align-items: center;
     justify-content: space-between;
     padding: 16px 18px 12px;
     font-size: 15px;
     font-weight: 600;
     border-bottom: 1px solid rgba(0,0,0,0.07);
 }
 html.dark #pcr-title-dialog-header {
     border-bottom-color: rgba(255,255,255,0.08);
 }
 #pcr-title-close-btn {
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
 #pcr-title-close-btn:hover { background: rgba(0,0,0,0.06); color: rgba(0,0,0,0.7); }
 html.dark #pcr-title-close-btn { color: rgba(255,255,255,0.4); }
 html.dark #pcr-title-close-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
 #pcr-title-dialog-body { padding: 14px 18px; }
 #pcr-title-dialog-footer {
     display: flex;
     gap: 8px;
     justify-content: flex-end;
     padding: 10px 18px 16px;
 }
 #pdfcrowd-title-convert {
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
 #pdfcrowd-title-convert:hover { opacity: 0.88 !important; }
 #pcr-title-cancel-btn {
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
 #pcr-title-cancel-btn:hover { background: rgba(0,0,0,0.09); }
 html.dark #pcr-title-cancel-btn { background: rgba(255,255,255,0.08); }
 html.dark #pcr-title-cancel-btn:hover { background: rgba(255,255,255,0.13); }

 .pdfcrowd-category {
     line-height: normal;
     margin-top: 1em;
 }

 .pdfcrowd-category-title {
     font-size: larger;
     font-weight: bold;
 }

/* ===== Settings Modal ===== */
#pdfcrowd-settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    animation: pcr-fade-in 0.15s ease;
}
@keyframes pcr-fade-in { from{opacity:0} to{opacity:1} }

#pdfcrowd-settings-modal {
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
    animation: pcr-slide-up 0.2s ease;
    font-family: inherit;
    font-size: 14px;
}
html.dark #pdfcrowd-settings-modal {
    background: #202123;
    color: rgba(255,255,255,0.92);
}
@keyframes pcr-slide-up { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }

#pdfcrowd-settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px 16px;
    border-bottom: 1px solid rgba(0,0,0,0.08);
    flex-shrink: 0;
}
html.dark #pdfcrowd-settings-header { border-bottom-color: rgba(255,255,255,0.08); }

#pdfcrowd-settings-header h2 {
    font-size: 16px; font-weight: 600; margin: 0; padding: 0; color: inherit;
}
#pdfcrowd-settings-close {
    width: 28px; height: 28px; border: none;
    background: rgba(0,0,0,0.06); border-radius: 50%;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: rgba(0,0,0,0.5); transition: background 0.15s;
    line-height: 1;
}
#pdfcrowd-settings-close:hover { background: rgba(0,0,0,0.1); }
html.dark #pdfcrowd-settings-close { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
html.dark #pdfcrowd-settings-close:hover { background: rgba(255,255,255,0.15); }

#pdfcrowd-settings-body { display: flex; flex: 1; overflow: hidden; }

#pdfcrowd-settings-form {
    flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
}

#pdfcrowd-settings-preview-col {
    width: 196px; flex-shrink: 0; padding: 14px 14px 14px 0;
    display: flex; flex-direction: column; align-items: center;
    border-left: 1px solid rgba(0,0,0,0.06);
}
html.dark #pdfcrowd-settings-preview-col { border-left-color: rgba(255,255,255,0.06); }

#pdfcrowd-settings-footer {
    display: flex; align-items: center; justify-content: flex-end;
    gap: 8px; padding: 12px 20px;
    border-top: 1px solid rgba(0,0,0,0.08); flex-shrink: 0;
}
html.dark #pdfcrowd-settings-footer { border-top-color: rgba(255,255,255,0.08); }

.pcr-section {
    background: #fff; border-radius: 14px; padding: 12px 14px;
    display: flex; flex-direction: column; gap: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
html.dark .pcr-section { background: rgba(255,255,255,0.05); }

.pcr-section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.09em; color: rgba(0,0,0,0.38); margin-bottom: -2px;
}
html.dark .pcr-section-title { color: rgba(255,255,255,0.32); }

.pcr-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; min-height: 30px;
}
.pcr-label { font-size: 13px; font-weight: 500; color: rgba(0,0,0,0.75); flex-shrink: 0; }
html.dark .pcr-label { color: rgba(255,255,255,0.8); }

.pcr-segment {
    display: flex; background: rgba(0,0,0,0.06);
    border-radius: 9px; padding: 2px; gap: 1px;
}
html.dark .pcr-segment { background: rgba(255,255,255,0.08); }

.pcr-seg-btn {
    flex: 1; padding: 4px 9px; border: none; border-radius: 7px;
    background: transparent; font-size: 12px; font-weight: 500;
    color: rgba(0,0,0,0.45); cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
html.dark .pcr-seg-btn { color: rgba(255,255,255,0.4); }
.pcr-seg-btn.active {
    background: #fff; color: rgba(0,0,0,0.85);
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}
html.dark .pcr-seg-btn.active { background: rgba(255,255,255,0.18); color: rgba(255,255,255,0.92); }

.pcr-toggle { position: relative; display: inline-block; width: 38px; height: 22px; cursor: pointer; flex-shrink: 0; }
.pcr-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.pcr-toggle-track {
    position: absolute; inset: 0; border-radius: 11px;
    background: rgba(0,0,0,0.15); transition: background 0.2s;
}
html.dark .pcr-toggle-track { background: rgba(255,255,255,0.2); }
.pcr-toggle input:checked + .pcr-toggle-track { background: #EA4C3A; }
.pcr-toggle-track::after {
    content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%;
    background: #fff; top: 3px; left: 3px;
    transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.pcr-toggle input:checked + .pcr-toggle-track::after { transform: translateX(16px); }

.pcr-slider-row { display: flex; align-items: center; gap: 10px; flex: 1; }
.pcr-slider {
    flex: 1; height: 4px; -webkit-appearance: none; appearance: none;
    background: rgba(0,0,0,0.12); border-radius: 2px; outline: none; cursor: pointer;
}
html.dark .pcr-slider { background: rgba(255,255,255,0.15); }
.pcr-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
    background: #EA4C3A; cursor: pointer; box-shadow: 0 1px 4px rgba(234,76,58,0.4);
}
.pcr-slider-value { font-size: 12px; font-weight: 600; color: rgba(0,0,0,0.5); min-width: 32px; text-align: right; }
html.dark .pcr-slider-value { color: rgba(255,255,255,0.5); }

.pcr-swatches { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
.pcr-swatch {
    height: 26px; padding: 0 9px; border-radius: 7px;
    border: 1.5px solid transparent; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
    background: rgba(0,0,0,0.06); color: rgba(0,0,0,0.55);
}
html.dark .pcr-swatch { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
.pcr-swatch.active { border-color: #EA4C3A; color: #EA4C3A; background: rgba(234,76,58,0.08); }
.pcr-swatch-color-wrap { display: flex; align-items: center; gap: 5px; }
.pcr-swatch-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0; }
.pcr-color-input { width: 30px; height: 26px; border-radius: 7px; border: 1.5px solid rgba(0,0,0,0.12); padding: 2px; cursor: pointer; background: none; }

.pcr-theme-cards { display: flex; gap: 7px; width: 100%; }
.pcr-theme-card {
    flex: 1; border: 2px solid rgba(0,0,0,0.08); border-radius: 10px;
    padding: 8px 6px 7px; cursor: pointer; transition: all 0.15s;
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    background: transparent; font-size: 11px; font-weight: 500; color: rgba(0,0,0,0.5);
}
html.dark .pcr-theme-card { border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.45); }
.pcr-theme-card.active { border-color: #EA4C3A !important; color: #EA4C3A !important; background: rgba(234,76,58,0.09) !important; box-shadow: 0 0 0 1px rgba(234,76,58,0.3); }
html.dark .pcr-theme-card.active { color: #ff9b8f !important; }
.pcr-theme-mini-doc {
    width: 44px; height: 56px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);
    padding: 5px 4px; gap: 3px; display: flex; flex-direction: column;
}
.pcr-theme-mini-doc.light { background: #fff; }
.pcr-theme-mini-doc.dark { background: #333; border-color: rgba(255,255,255,0.1); }
.pcr-theme-mini-doc.auto-doc { background: linear-gradient(135deg, #fff 50%, #333 50%); }
.pcr-mini-line { height: 3px; border-radius: 2px; background: rgba(0,0,0,0.18); }
.pcr-mini-line.on-dark { background: rgba(255,255,255,0.3); }
.pcr-mini-line.w100 { width: 100%; }
.pcr-mini-line.w75 { width: 75%; }
.pcr-mini-line.w50 { width: 50%; }

.pcr-sub-section {
    flex-direction: column; gap: 8px; padding-top: 10px;
    border-top: 1px solid rgba(0,0,0,0.06); margin-top: 2px;
}
html.dark .pcr-sub-section { border-top-color: rgba(255,255,255,0.06); }
.pcr-margins-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.pcr-margin-field { display: flex; flex-direction: column; gap: 3px; }
.pcr-margin-field label { font-size: 11px; color: rgba(0,0,0,0.4); font-weight: 500; }
html.dark .pcr-margin-field label { color: rgba(255,255,255,0.35); }
.pcr-margin-input {
    width: 100%; padding: 5px 8px; border: 1px solid rgba(0,0,0,0.12); border-radius: 7px;
    font-size: 12px; background: rgba(0,0,0,0.03); color: inherit; outline: none; box-sizing: border-box;
}
html.dark .pcr-margin-input { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); }
.pcr-margin-input:focus { border-color: #EA4C3A; }

.pcr-btn-reset {
    padding: 7px 14px; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 10px;
    background: transparent; font-size: 13px; font-weight: 500; color: rgba(0,0,0,0.5); cursor: pointer; transition: all 0.15s;
}
html.dark .pcr-btn-reset { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.45); }
.pcr-btn-reset:hover { background: rgba(0,0,0,0.05); }
html.dark .pcr-btn-reset:hover { background: rgba(255,255,255,0.05); }

.pcr-btn-apply {
    padding: 7px 18px; border: none; border-radius: 10px;
    background: #EA4C3A; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s;
}
.pcr-btn-apply:hover { background: #d44433; }

.pcr-saved-note { font-size: 12px; color: #2c9e5c; opacity: 0; transition: opacity 0.3s; margin-right: auto; }
.pcr-saved-note.visible { opacity: 1; }

#pcr-preview-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em;
    color: rgba(0,0,0,0.32); margin-bottom: 10px; align-self: flex-start; margin-left: 16px;
}
html.dark #pcr-preview-label { color: rgba(255,255,255,0.28); }

#pcr-preview-doc {
    width: 152px; border-radius: 8px; padding: 12px 10px;
    display: flex; flex-direction: column; gap: 7px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15); transition: background 0.3s; overflow: hidden;
    position: relative;
}
#pcr-preview-doc.preview-light { background: #fff; }
#pcr-preview-doc.preview-dark { background: #333; }

.pcr-prev-title { height: 7px; background: rgba(0,0,0,0.3) !important; border-radius: 3px; width: 65%; margin-bottom: 3px; flex-shrink: 0; }
.preview-dark .pcr-prev-title { background: rgba(255,255,255,0.4) !important; }

.pcr-prev-user { border-radius: 3px; padding: 5px 6px; display: flex; flex-direction: column; gap: 3px; transition: all 0.2s; }
.pcr-prev-line { height: 3px; border-radius: 2px; background: rgba(0,0,0,0.15); }
.preview-dark .pcr-prev-line { background: rgba(255,255,255,0.22); }
.pcr-prev-line.w80 { width: 80%; }
.pcr-prev-line.w60 { width: 60%; }
.pcr-prev-line.w90 { width: 90%; }
.pcr-prev-line.w40 { width: 40%; }
 .pcr-prev-line.w55 { width: 55%; }
.pcr-prev-ai { display: flex; flex-direction: column; gap: 3px; padding: 2px 0; }
.pcr-prev-break { height: 0; border-top: 1.5px dashed rgba(0,0,0,0.18); margin: 2px 0; }
.preview-dark .pcr-prev-break { border-top-color: rgba(255,255,255,0.2); }
`;
    document.head.appendChild(blockStyle);

    // ── Theme definitions ─────────────────────────────────────────────────
    // Themes: only promptBg and blockquote border change.
    // Code blocks and tables stay neutral. Text is always #1a1a1a.
    const PDFCROWD_THEMES = {
        'default':  { label: 'Default',  swatch: '#f4f4f4', promptBg: '#f4f4f4', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#d0d0d0', accent: '#aaaaaa', darkPromptBg: '#2a2a2a' },
        'none':     { label: 'None',     swatch: '#ffffff', promptBg: 'transparent', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#d0d0d0', accent: '#aaaaaa', darkPromptBg: 'transparent' },
        'rose':     { label: 'Rose',     swatch: '#fce4ec', promptBg: '#fce4ec', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#f48fb1', accent: '#e91e63', darkPromptBg: '#2e1f24' },
        'lavender': { label: 'Lavender', swatch: '#f3e5f5', promptBg: '#f3e5f5', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#ce93d8', accent: '#9c27b0', darkPromptBg: '#261e30' },
        'sky':      { label: 'Sky',      swatch: '#e3f2fd', promptBg: '#e3f2fd', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#90caf9', accent: '#1976d2', darkPromptBg: '#1c2535' },
        'mint':     { label: 'Mint',     swatch: '#e0f2f1', promptBg: '#e0f2f1', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#80cbc4', accent: '#00897b', darkPromptBg: '#1c2c2b' },
        'sage':     { label: 'Sage',     swatch: '#e8f5e9', promptBg: '#e8f5e9', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#a5d6a7', accent: '#388e3c', darkPromptBg: '#1e2b20' },
        'lemon':    { label: 'Lemon',    swatch: '#fffde7', promptBg: '#fffde7', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#fff176', accent: '#f9a825', darkPromptBg: '#2a2818' },
        'peach':    { label: 'Peach',    swatch: '#fff3e0', promptBg: '#fff3e0', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#ffcc80', accent: '#ef6c00', darkPromptBg: '#2a2218' }
    };

    const pdfcrowdBlockHtml = `
    <button
        id="pdfcrowd-convert-main"
        type="button"
        role="button"
        tabindex="0"
        aria-label="Export"
        data-conv-options='{"page_size": "a4"}'
        class="btn btn-secondary btn-small pdfcrowd-h-9 pdfcrowd-convert pdfcrowd-fs-small">
        <span id="pdfcrowd-btn-left">
        <img class="pdfcrowd-mr-1 pdfcrowd-btn-content" src="data:image/png;base64,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" style="width:1rem;height:1rem;">
        <div class="pdfcrowd-lg pdfcrowd-btn-content">
            Export
        </div>
        </span>
        <div id="pdfcrowd-more" class="pdfcrowd-dropdown-arrow">
        </div>
        <div id="pdfcrowd-spinner" class="pdfcrowd-hidden">
            <div class="pdfcrowd-flex pdfcrowd-justify-center pdfcrowd-items-center pdfcrowd-mr-4" style="height: 100%;">
                <div class="pcr-dots-loader">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
<<<<<<< Updated upstream
=======
        <div id="pcr-rateus-face" style="display:none;align-items:center;justify-content:center;gap:5px;width:100%;height:100%;padding:0 0.5rem;font-size:13px;font-weight:600;cursor:pointer;">
            <span style="font-size:15px;color:#EA4C3A;">★</span>
            <span>Rate us</span>
        </div>
>>>>>>> Stashed changes
    </button>
    <div id="pcr-rateus-dropdown" style="display:none;">
        <div class="pcr-dropdown-label">Enjoying it?</div>
        <div class="pdfcrowd-stars" id="pcr-dropdown-stars">
            <span class="pdfcrowd-star" data-n="1">★</span>
            <span class="pdfcrowd-star" data-n="2">★</span>
            <span class="pdfcrowd-star" data-n="3">★</span>
            <span class="pdfcrowd-star" data-n="4">★</span>
            <span class="pdfcrowd-star" data-n="5">★</span>
        </div>
    </div>
    <div id="pdfcrowd-no-chat-tooltip" class="pdfcrowd-no-chat-tooltip">
        Open a conversation first — then click Export
    </div>
    <button id="pdfcrowd-exit-select" title="Exit selection mode"
        style="display:none;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(0,0,0,0.2);background:white;cursor:pointer;font-size:13px;line-height:1;color:#555;margin-left:4px;flex-shrink:0">&#x2715;</button>

    <div id="pdfcrowd-extra-btns" class="pdfcrowd-hidden pdfcrowd-text-left">

        <button
            id="pdfcrowd-blocks"
            type="button"
            class="pdfcrowd-extra-btn">
            <span class="pdfcrowd-menu-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="1.5" y="4" width="7" height="7" rx="1.5"/>
                    <path d="M3 7.5l2 2 3-3" stroke-width="1.5"/>
                    <path d="M11 5.5h5.5M11 8h4M11 10.5h5.5" stroke-width="1.5"/>
                </svg>
            </span>
            <span class="pdfcrowd-menu-text">
                <span class="pdfcrowd-menu-title">Select to export</span>
                <span class="pdfcrowd-menu-desc">Pick blocks to export</span>
            </span>
        </button>

        <button
            id="pdfcrowd-ai-only"
            type="button"
            class="pdfcrowd-extra-btn">
            <span class="pdfcrowd-menu-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 4a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5l-3 3V4z"/>
                    <path d="M12.5 2.5l-.6 1.3-1.3.6 1.3.6.6 1.3.6-1.3 1.3-.6-1.3-.6-.6-1.3z" fill="currentColor" stroke="none"/>
                </svg>
            </span>
            <span class="pdfcrowd-menu-text">
                <span class="pdfcrowd-menu-title">AI answers only</span>
                <span class="pdfcrowd-menu-desc">Exclude your prompts from the PDF</span>
            </span>
        </button>


        <div class="pdfcrowd-divider"></div>

        <a
            id="pdfcrowd-options"
            href="#"
            class="pdfcrowd-extra-btn">
            <span class="pdfcrowd-menu-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="9" r="2.2"/>
                    <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4"/>
                </svg>
            </span>
            <span class="pdfcrowd-menu-text">
                <span class="pdfcrowd-menu-title">Settings</span>
            </span>
            <span class="pdfcrowd-menu-arrow">›</span>
        </a>

        <div class="pdfcrowd-rate-row">
            <span>Rate us</span>
            <div class="pdfcrowd-stars" id="pdfcrowd-stars">
                <span class="pdfcrowd-star" data-n="1">★</span>
                <span class="pdfcrowd-star" data-n="2">★</span>
                <span class="pdfcrowd-star" data-n="3">★</span>
                <span class="pdfcrowd-star" data-n="4">★</span>
                <span class="pdfcrowd-star" data-n="5">★</span>
            </div>
        </div>

    </div>

    <div class="pdfcrowd-overlay" id="pdfcrowd-error-overlay">
        <div class="pdfcrowd-dialog">
            <div class="pdfcrowd-dialog-header">
                Error occurred
                <span class="pdfcrowd-close-x pdfcrowd-close-btn">&times;</span>
            </div>
            <div class="pdfcrowd-dialog-body" style="text-align: center;">
                <p id="pdfcrowd-error-message"></p>
            </div>
            <div class="pdfcrowd-dialog-footer">
                <button class="btn btn-secondary pdfcrowd-close-btn">Close</button>
                <div class="pdfcrowd-version">${pdfcrowdShared.version}</div>
            </div>
        </div>
    </div>

    <div id="pdfcrowd-blocks-bar">
        <span id="pdfcrowd-blocks-count">0 blocks selected</span>
        <button id="pdfcrowd-blocks-export">Export selected</button>
        <button id="pdfcrowd-blocks-cancel">Cancel</button>
    </div>

    <div class="pdfcrowd-loading-overlay" id="pdfcrowd-loading-overlay">
        <div class="pdfcrowd-spinner"></div>
        <div>Loading conversation...</div>
        <button id="pdfcrowd-cancel-loading"
                class="btn btn-secondary"
                style="margin-top: .5em;">
            Cancel
        </button>
    </div>

    <div class="pdfcrowd-overlay" id="pdfcrowd-title-overlay">
        <div id="pcr-title-dialog">
            <div id="pcr-title-dialog-header">
                <span>Enter PDF title</span>
                <button id="pcr-title-close-btn" class="pdfcrowd-close-btn">&times;</button>
            </div>
            <div id="pcr-title-dialog-body">
                <input id="pdfcrowd-title" name="pdfcrowd-title-ch" autocomplete="off" autocapitalize="off" placeholder="e.g. My ChatGPT conversation">
            </div>
            <div id="pcr-title-dialog-footer">
                <button id="pcr-title-cancel-btn" class="pdfcrowd-close-btn">Cancel</button>
                <button id="pdfcrowd-title-convert">Export</button>
            </div>
        </div>
    </div>

    <div class="pdfcrowd-overlay" id="pdfcrowd-help-overlay">
        <div class="pdfcrowd-dialog">
            <div class="pdfcrowd-dialog-header">
                Export ChatGPT Conversation
                <span class="pdfcrowd-close-x pdfcrowd-close-btn">&times;</span>
            </div>
            <div class="pdfcrowd-dialog-body">
                ${pdfcrowdShared.helpContent}
            </div>

            <div class="pdfcrowd-dialog-footer">
                <button class="btn btn-secondary pdfcrowd-close-btn">Close</button>
                <div class="pdfcrowd-version">${pdfcrowdShared.version}</div>
            </div>
        </div>
    </div>

    <div id="pdfcrowd-settings-overlay" style="display:none">
      <div id="pdfcrowd-settings-modal">
        <div id="pdfcrowd-settings-header">
          <h2>Settings</h2>
          <button id="pdfcrowd-settings-close">✕</button>
        </div>
        <div id="pdfcrowd-settings-body">
          <div id="pdfcrowd-settings-form">

            <div class="pcr-section">
              <div class="pcr-section-title">Output Format</div>
              <div class="pcr-row">
                <span class="pcr-label">Single page</span>
                <label class="pcr-toggle"><input type="checkbox" id="pcr-single-page"><span class="pcr-toggle-track"></span></label>
              </div>
              <div class="pcr-row">
                <span class="pcr-label">Page size</span>
                <div style="display:flex;gap:8px;align-items:center;">
                  <div class="pcr-segment" id="pcr-page-size">
                    <button class="pcr-seg-btn active" data-value="a4">A4</button>
                    <button class="pcr-seg-btn" data-value="a5">A5</button>
                  </div>
                  <div class="pcr-segment" id="pcr-orientation">
                    <button class="pcr-seg-btn active" data-value="">↕</button>
                    <button class="pcr-seg-btn" data-value="landscape">↔</button>
                  </div>
                </div>
              </div>
              <div class="pcr-row" style="align-items:flex-start;flex-direction:column;gap:7px;">
                <span class="pcr-label">Color theme</span>
                <div class="pcr-theme-cards" id="pcr-theme">
                  <button class="pcr-theme-card active" data-value="">
                    <div class="pcr-theme-mini-doc auto-doc">
                      <div class="pcr-mini-line w100"></div><div class="pcr-mini-line w75"></div><div class="pcr-mini-line w50"></div>
                    </div>Auto
                  </button>
                  <button class="pcr-theme-card" data-value="light">
                    <div class="pcr-theme-mini-doc light">
                      <div class="pcr-mini-line w100"></div><div class="pcr-mini-line w75"></div><div class="pcr-mini-line w50"></div>
                    </div>Light
                  </button>
                  <button class="pcr-theme-card" data-value="dark">
                    <div class="pcr-theme-mini-doc dark">
                      <div class="pcr-mini-line w100 on-dark"></div><div class="pcr-mini-line w75 on-dark"></div><div class="pcr-mini-line w50 on-dark"></div>
                    </div>Dark
                  </button>
                </div>
              </div>
              <div class="pcr-row">
                <span class="pcr-label">Font size</span>
                <div class="pcr-slider-row">
                  <input type="range" class="pcr-slider" id="pcr-zoom" min="70" max="200" step="5" value="100">
                  <span class="pcr-slider-value" id="pcr-zoom-value">100%</span>
                </div>
              </div>
              <div class="pcr-row">
                <span class="pcr-label">Margins</span>
                <div class="pcr-segment" id="pcr-margins">
                  <button class="pcr-seg-btn active" data-value="">Default</button>
                  <button class="pcr-seg-btn" data-value="minimal">Minimal</button>
                  <button class="pcr-seg-btn" data-value="custom">Custom</button>
                </div>
              </div>
              <div class="pcr-sub-section" id="pcr-margins-custom" style="display:none;">
                <div class="pcr-margins-grid">
                  <div class="pcr-margin-field"><label>Top</label><input type="text" class="pcr-margin-input" id="pcr-margin-top" value="0.4in"></div>
                  <div class="pcr-margin-field"><label>Bottom</label><input type="text" class="pcr-margin-input" id="pcr-margin-bottom" value="0.4in"></div>
                  <div class="pcr-margin-field"><label>Left</label><input type="text" class="pcr-margin-input" id="pcr-margin-left" value="0.4in"></div>
                  <div class="pcr-margin-field"><label>Right</label><input type="text" class="pcr-margin-input" id="pcr-margin-right" value="0.4in"></div>
                </div>
              </div>
              <div class="pcr-row">
                <span class="pcr-label">Page breaks</span>
                <div class="pcr-segment" id="pcr-page-break">
                  <button class="pcr-seg-btn active" data-value="">Auto</button>
                  <button class="pcr-seg-btn" data-value="after">After each answer</button>
                </div>
              </div>
            </div>

            <div class="pcr-section">
              <div class="pcr-section-title">Theme</div>
              <div class="pcr-row">
                <span class="pcr-label">Style</span>
                <input type="hidden" id="pcr-q-color-value" value="default">
                <div id="pcr-q-palette" style="display:flex;flex-wrap:wrap;gap:5px;max-width:240px;">
                </div>
              </div>
            </div>

            <div class="pcr-section">
              <div class="pcr-section-title">Document Info</div>
              <div class="pcr-row">
                <span class="pcr-label">PDF Title</span>
                <div class="pcr-segment" id="pcr-title-mode">
                  <button class="pcr-seg-btn active" data-value="">Chat name</button>
                  <button class="pcr-seg-btn" data-value="ask">Ask me</button>
                  <button class="pcr-seg-btn" data-value="none">None</button>
                </div>
              </div>
              <div class="pcr-row">
                <span class="pcr-label">Creation date</span>
                <div class="pcr-segment" id="pcr-datetime">
                  <button class="pcr-seg-btn" data-value="none">None</button>
                  <button class="pcr-seg-btn active" data-value="date_only">Date</button>
                  <button class="pcr-seg-btn" data-value="full">Date & time</button>
                </div>
              </div>
              <div class="pcr-row">
                <span class="pcr-label">Table of contents</span>
                <div class="pcr-segment" id="pcr-toc">
                  <button class="pcr-seg-btn" data-value="">None</button>
                  <button class="pcr-seg-btn active" data-value="basic">Standard</button>
                  <button class="pcr-seg-btn" data-value="numbering">Numbered</button>
                </div>
              </div>
              <div class="pcr-row">
                <span class="pcr-label">Include model name</span>
                <label class="pcr-toggle"><input type="checkbox" id="pcr-model-name"><span class="pcr-toggle-track"></span></label>
              </div>
              <div class="pcr-row">
                <span class="pcr-label">Source link</span>
                <label class="pcr-toggle"><input type="checkbox" id="pcr-source-link" checked><span class="pcr-toggle-track"></span></label>
              </div>
            </div>

          </div>
          <div id="pdfcrowd-settings-preview-col">
            <div id="pcr-preview-label">Preview</div>
            <div id="pcr-preview-doc" class="preview-light">
              <div class="pcr-prev-title"></div>
              <div class="pcr-prev-date" style="display:none;height:2px;width:50%;border-radius:2px;margin-bottom:2px;"></div>
              <!-- model + source link: absolutely positioned top-right corner -->
              <div id="pcr-prev-meta" style="position:absolute;top:8px;right:8px;display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
                <div class="pcr-prev-model" style="display:none;height:2px;width:22px;border-radius:1px;"></div>
                <div class="pcr-prev-source" style="display:none;height:2px;width:30px;border-radius:1px;opacity:0.6;"></div>
              </div>
              <div class="pcr-prev-toc" style="display:none;flex-direction:column;gap:3px;padding:4px 0 5px;">
                <div style="display:flex;align-items:center;gap:2px;">
                  <div class="pcr-toc-dot" style="width:3px;height:3px;border-radius:50%;background:rgba(74,144,217,0.9);flex-shrink:0;"></div>
                  <div class="pcr-toc-line" style="height:2px;width:78%;background:rgba(74,144,217,0.6);border-radius:1px;"></div>
                  <div class="pcr-toc-pg" style="width:4px;height:2px;background:rgba(74,144,217,0.4);border-radius:1px;margin-left:auto;"></div>
                </div>
                <div style="display:flex;align-items:center;gap:2px;padding-left:6px;">
                  <div class="pcr-toc-dot" style="width:2px;height:2px;border-radius:50%;background:rgba(74,144,217,0.65);flex-shrink:0;"></div>
                  <div class="pcr-toc-line" style="height:2px;width:60%;background:rgba(74,144,217,0.42);border-radius:1px;"></div>
                  <div class="pcr-toc-pg" style="width:4px;height:2px;background:rgba(74,144,217,0.3);border-radius:1px;margin-left:auto;"></div>
                </div>
                <div style="display:flex;align-items:center;gap:2px;padding-left:6px;">
                  <div class="pcr-toc-dot" style="width:2px;height:2px;border-radius:50%;background:rgba(74,144,217,0.65);flex-shrink:0;"></div>
                  <div class="pcr-toc-line" style="height:2px;width:50%;background:rgba(74,144,217,0.42);border-radius:1px;"></div>
                  <div class="pcr-toc-pg" style="width:4px;height:2px;background:rgba(74,144,217,0.3);border-radius:1px;margin-left:auto;"></div>
                </div>
              </div>
              <div style="display:flex;align-items:flex-start;gap:4px;">
                <div class="pcr-prev-avatar" style="width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,0.22);flex-shrink:0;margin-top:4px;"></div>
                <div class="pcr-prev-user" id="pcr-prev-user-1" style="flex:1;">
                  <div class="pcr-prev-line w80"></div>
                  <div class="pcr-prev-line w60"></div>
                </div>
              </div>
              <div class="pcr-prev-ai">
                <div class="pcr-prev-line w90"></div>
                <div class="pcr-prev-line w80"></div>
                <div class="pcr-prev-line w60"></div>
              </div>
              <div style="display:flex;align-items:stretch;gap:3px;padding:1px 0;">
                <div class="pcr-prev-bq-bar" style="width:2px;background:#d0d0d0;border-radius:1px;flex-shrink:0;"></div>
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
                  <div class="pcr-prev-line w80"></div>
                  <div class="pcr-prev-line w55"></div>
                </div>
              </div>
              <div class="pcr-prev-break" id="pcr-prev-break" style="display:none;"></div>
              <div style="display:flex;align-items:flex-start;gap:4px;">
                <div class="pcr-prev-avatar" style="width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,0.22);flex-shrink:0;margin-top:4px;"></div>
                <div class="pcr-prev-user" id="pcr-prev-user-2" style="flex:1;">
                  <div class="pcr-prev-line w60"></div>
                </div>
              </div>
              <div class="pcr-prev-ai">
                <div class="pcr-prev-line w90"></div>
                <div class="pcr-prev-line w40"></div>
              </div>

            </div>
          </div>
        </div>
        <div id="pdfcrowd-settings-footer">
          <span class="pcr-saved-note" id="pcr-saved-note">✓ Saved</span>
          <button class="pcr-btn-reset" id="pdfcrowd-settings-reset">Reset to defaults</button>
          <button class="pcr-btn-apply" id="pdfcrowd-settings-apply">Apply Changes</button>
        </div>
      </div>
    </div>
`;

    function findRow(element) {
        return element.closest(
            'section[data-testid^="conversation-turn"]'
        ) || element.closest('article');
    }

    function hasParent(element, parent) {
        while(element) {
            if(element === parent) {
                return true;
            }
            element = element.parentElement;
        }
        return false;
    }

    function addImgBase64Src(element) {
        const images = element.querySelectorAll('img');

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const src = img.getAttribute('src');

            if (!src ||
                !src.startsWith('https://chatgpt.com/backend-api/') ||
                img.hasAttribute('data-pdfcrowd-img-src')) {
                continue;
            }

            // Skip if image is not yet loaded
            if (!img.complete || img.naturalWidth === 0) {
                continue;
            }

            const canvas = document.createElement('canvas');
            canvas.classList.add('pdfcrowd-img-canvas');
            canvas.style.setProperty('display', 'none', 'important');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            img.setAttribute('data-pdfcrowd-img-src', canvas.toDataURL());
        }
    }

    function applyDataSrcBase(element) {
        const images = element.querySelectorAll('img[data-pdfcrowd-img-src]');

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const dataSrc = img.getAttribute('data-pdfcrowd-img-src');

            if (dataSrc) {
                img.setAttribute('src', dataSrc);
            }
        }
    }

    function prepareSelection(element) {
        addImgBase64Src(element);

        const selection = window.getSelection();
        if(!selection.isCollapsed) {
            const rangeCount = selection.rangeCount;
            if(rangeCount > 0) {
                const startElement = findRow(
                    selection.getRangeAt(0).startContainer.parentElement);
                if(startElement && hasParent(startElement, element)) {
                    // selection is in the main block
                    const endElement = findRow(
                        selection.getRangeAt(
                            rangeCount-1).endContainer.parentElement);

                    const newContainer = document.createElement('main');
                    newContainer.classList.add('h-full', 'w-full');
                    let currentElement = startElement;
                    while(currentElement) {
                        const child_clone = currentElement.cloneNode(true);
                        newContainer.appendChild(child_clone);
                        persistCanvases(currentElement, child_clone);
                        if(currentElement === endElement) {
                            break;
                        }
                        currentElement = currentElement.nextElementSibling;
                    }
                    return newContainer;
                }
            }
        }
        let element_clone = element.cloneNode(true);
        persistCanvases(element, element_clone);
        applyDataSrcBase(element_clone);

        if(element_clone.tagName.toLowerCase() !== 'main') {
            // add main element as it's not presented in a shared chat
            const main = document.createElement('main');
            main.classList.add('h-full', 'w-full');
            main.appendChild(element_clone);
            element_clone = main;
        }
        return element_clone;
    }

    function prepareContent(element) {
        element = prepareSelection(element);

        // fix nested buttons error
        element.querySelectorAll('button button').forEach(button => {
            button.parentNode.removeChild(button);
        });

        // remove scripts, styles, and unnecessary elements
        element.querySelectorAll(
            'script, style, .absolute.z-0, .absolute.z-1, #AIPRM__sidebar'
        ).forEach(el => el.remove());

        // solve expired images
        element.querySelectorAll('.grid img').forEach(img => {
            img.setAttribute(
                'alt', 'The image has expired. Refresh ChatGPT page and retry saving to PDF.');
        });

        element.classList.add('chat-gpt-custom');

        return element;
    }

    function showHelp() {
        document.getElementById('pdfcrowd-extra-btns').classList.add(
            'pdfcrowd-hidden');

        document.getElementById('pdfcrowd-help-overlay').style.display = 'flex';
    }

    function addPdfExtension(filename) {
        return filename.replace(/\.*$/, '') + '.pdf';
    }

    function parseRgbColor(color) {
        const match = String(color || '').match(
            /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
        if(!match) {
            return null;
        }
        const alpha = match[4] === undefined ? 1 : parseFloat(match[4]);
        if(alpha === 0) {
            return null;
        }
        return {
            r: parseInt(match[1], 10),
            g: parseInt(match[2], 10),
            b: parseInt(match[3], 10)
        };
    }

    function colorLuminance(color) {
        const rgb = parseRgbColor(color);
        if(!rgb) {
            return null;
        }
        return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    }

    function isLight(body) {
        const docEl = document.documentElement;
        const docStyle = window.getComputedStyle(docEl);
        const bodyStyle = window.getComputedStyle(body || document.body);

        if(docEl.classList.contains('dark') ||
           docEl.style.colorScheme === 'dark' ||
           docStyle.colorScheme === 'dark' ||
           docEl.dataset.chatTheme === 'dark') {
            return false;
        }

        if(docEl.classList.contains('light') ||
           docEl.style.colorScheme === 'light' ||
           docStyle.colorScheme === 'light' ||
           docEl.dataset.chatTheme === 'light') {
            return true;
        }

        const luminance = colorLuminance(bodyStyle.backgroundColor) ??
              colorLuminance(docStyle.backgroundColor);
        return luminance === null ? true : luminance > 0.5;
    }

    function isElementVisible(element) {
        const style = window.getComputedStyle(element);
        return (
            style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                element.offsetWidth > 0 &&
                element.offsetHeight > 0 &&
                style.opacity !== '0'
        );
    }

    function styleCanvasArea(element, stop_element) {
        while(element) {
            if(element == stop_element) {
                // canvas parent area not found
                return;
            }

            const style_height = element.style.height;
            if(style_height &&
               style_height !== 'auto' &&
               style_height !== 'initial') {
                element.style.height = '';
                return;
            }

            element = element.parentElement;
        }
    }

    function persistCanvases(orig_element, new_element) {
        const items = [];
        const orig_canvases = orig_element.querySelectorAll('canvas');
        const new_canvases = new_element.querySelectorAll('canvas');
        if(orig_canvases.length !== new_canvases.length) {
            return;
        }
        for(let i = 0; i < orig_canvases.length; i++) {
            const orig_canvas = orig_canvases[i];
            if(isElementVisible(orig_canvas)) {
                const new_canvas = new_canvases[i];
                const img = new_canvas.ownerDocument.createElement('img');
                img.src = orig_canvas.toDataURL();
                img.classList.add('pdfcrowd-canvas-img');
                new_canvas.parentNode.replaceChild(img, new_canvas);

                styleCanvasArea(img, new_element);
            }
        }
    }

    function getTitle() {
        let title = '';
        const chatTitle = document.querySelector(
            `nav a[href="${window.location.pathname}"]`);
        if(chatTitle) {
            // use chat title 1st as it does not contain model name in it
            title = chatTitle.textContent.trim();
        }
        if(!title) {
            const titles = document.getElementsByTagName('title');
            if(titles.length > 0) {
                title = titles[0].textContent.trim();
            }
        }
        return title;
    }

    function applyDarkCodeBlockStyles(main_clone, isDarkMode, theme) {
        // Light mode uses theme colors; dark mode uses VS Code-like colors
        const t = theme || {};
        const CODE_DARK_BG   = isDarkMode ? '#1e1e1e' : (t.codeBg   || '#f4f4f4');
        const CODE_HEADER_BG = isDarkMode ? '#252525' : (t.codeHeader || '#ebebeb');
        const CODE_DARK_FG   = isDarkMode ? '#e8e8e8' : '#1a1a1a';
        const CODE_MUTED_FG  = isDarkMode ? '#c6c6c6' : '#6b7280';

        function setBg(el, color) {
            if(!el || el.nodeType !== 1) {
                return;
            }
            el.style.setProperty('background', color, 'important');
            el.style.setProperty('background-color', color, 'important');
            el.style.setProperty('background-image', 'none', 'important');
        }

        function setTransparentBg(el) {
            if(!el || el.nodeType !== 1) {
                return;
            }
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
            el.style.setProperty('background-image', 'none', 'important');
        }

        function collectCodeBlockParts(codeElement) {
            const codeText = (codeElement.textContent || '').trim();
            const parts = [];
            let current = codeElement.closest('pre') || codeElement;

            for(let depth = 0; depth < 8; depth++) {
                parts.push(current);

                const parent = current.parentElement;
                if(!parent ||
                   parent === main_clone ||
                   parent.hasAttribute('data-message-author-role')) {
                    break;
                }

                const parentText = (parent.textContent || '').trim();
                if(codeText && parentText.length > codeText.length + 500) {
                    break;
                }

                current = parent;
            }

            return parts;
        }

        function createCodeBlock(doc, language, codeText, codeHtml) {
            const block = doc.createElement('div');
            block.setAttribute('data-pdfcrowd-code-block', 'true');
            block.style.cssText = [
                `background:${CODE_DARK_BG} !important`,
                `background-color:${CODE_DARK_BG} !important`,
                'background-image:none !important',
                `color:${CODE_DARK_FG} !important`,
                'border:1px solid #3a3a3a !important',
                'border-radius:8px !important',
                'overflow:hidden !important',
                'margin:1em 0 !important',
                'padding:0 !important',
                'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace !important'
            ].join(';');

            if(language) {
                const header = doc.createElement('div');
                header.textContent = language;
                header.style.cssText = [
                    `background:${CODE_HEADER_BG} !important`,
                    `background-color:${CODE_HEADER_BG} !important`,
                    `color:${CODE_MUTED_FG} !important`,
                    'font:600 12px/1.4 Arial,sans-serif !important',
                    'padding:8px 12px !important'
                ].join(';');
                block.appendChild(header);
            }

            const pre = doc.createElement('pre');
            // Use plain text only — codeHtml preserves CodeMirror
            // internal line-highlight artifacts without the CSS colors.
            pre.textContent = codeText;
            pre.style.cssText = [
                'background:transparent !important',
                'background-color:transparent !important',
                `color:${CODE_DARK_FG} !important`,
                'display:block !important',
                'white-space:pre-wrap !important',
                'word-break:break-word !important',
                'overflow-wrap:anywhere !important',
                'margin:0 !important',
                'padding:12px !important',
                'font:400 13px/1.5 "Courier New",ui-monospace,Menlo,Monaco,Consolas,monospace !important'
            ].join(';');
            block.appendChild(pre);

            return block;
        }

        function getCodeLanguage(root, codeText) {
            const firstChild = root.firstElementChild;
            if(!firstChild) {
                return '';
            }

            const text = (firstChild.textContent || '').trim();
            if(!text || text.length > 40 || text === codeText.trim()) {
                return '';
            }
            return text.replace(/\s*copy\s*$/i, '').trim();
        }

        function getTextWithLineBreaks(element) {
            let text = '';

            element.childNodes.forEach(function(node) {
                if(node.nodeType === Node.TEXT_NODE) {
                    text += node.textContent;
                } else if(node.nodeType === Node.ELEMENT_NODE) {
                    if(node.tagName.toLowerCase() === 'br') {
                        text += '\n';
                    } else {
                        text += getTextWithLineBreaks(node);
                    }
                }
            });

            return text;
        }

        function replaceCodeMirrorBlocks() {
            const viewers = Array.from(
                main_clone.querySelectorAll('#code-block-viewer'));

            function findCodeMirrorRoot(viewer, codeText) {
                let root = viewer;
                let current = viewer;

                for(let depth = 0; depth < 12; depth++) {
                    const parent = current.parentElement;
                    if(!parent ||
                       parent === main_clone ||
                       parent.hasAttribute('data-message-author-role')) {
                        break;
                    }

                    const parentText = (parent.textContent || '').trim();
                    if(codeText &&
                       parentText.length > codeText.trim().length + 700) {
                        break;
                    }

                    root = parent;
                    current = parent;
                }

                return root;
            }

            viewers.forEach(function(viewer) {
                if(!viewer.isConnected ||
                   viewer.closest('[data-pdfcrowd-code-block]')) {
                    return;
                }

                const code = viewer.querySelector('.cm-content code, code');
                if(!code) {
                    return;
                }

                const codeText = getTextWithLineBreaks(code).replace(/\n+$/, '');
                if(!codeText.trim()) {
                    return;
                }

                // Preserve syntax-highlighted HTML if spans are present
                const codeHtml = code.querySelector('span') ? code.innerHTML : null;

                const root = findCodeMirrorRoot(viewer, codeText);
                if(!root || !root.parentNode) {
                    return;
                }

                const languageEl = root.querySelector(
                    '.text-token-text-primary');
                const language = languageEl
                    ? languageEl.textContent.replace(/\s+/g, ' ').trim()
                    : '';
                const replacement = createCodeBlock(
                    root.ownerDocument,
                    language,
                    codeText,
                    codeHtml
                );

                root.parentNode.replaceChild(replacement, root);
            });
        }

        replaceCodeMirrorBlocks();

        Array.from(main_clone.querySelectorAll(
            'pre, code[class*="language-"], code.hljs, .hljs'
        )).forEach(function(codeElement) {
            if(!codeElement.isConnected ||
               codeElement.closest('[data-pdfcrowd-code-block]')) {
                return;
            }

            const className = String(codeElement.className || '');
            const isBlockCode = codeElement.tagName.toLowerCase() === 'pre' ||
                className.includes('language-') ||
                className.includes('hljs') ||
                (codeElement.textContent || '').includes('\n');
            if(!isBlockCode) {
                return;
            }

            const codeText = (codeElement.textContent || '').replace(/\n+$/, '');
            if(!codeText.trim()) {
                return;
            }

            const parts = collectCodeBlockParts(codeElement);
            const root = parts[parts.length - 1] || codeElement;
            if(!root.parentNode) {
                return;
            }
            const language = getCodeLanguage(root, codeText);
            const replacement = createCodeBlock(
                root.ownerDocument,
                language,
                codeText
            );

            root.parentNode.replaceChild(replacement, root);
        });

        main_clone.querySelectorAll('code').forEach(function(code) {
            if(code.closest('[data-pdfcrowd-code-block]')) {
                return;
            }
            setBg(code, CODE_DARK_BG);
            code.style.setProperty('color', CODE_DARK_FG, 'important');
            code.style.setProperty('border-radius', '4px', 'important');
            code.style.setProperty('padding', '0.1em 0.25em', 'important');
        });
    }

    function applyQuestionStyles(main_clone, options) {
        const isDark = options.theme === 'dark' ||
              (options.theme === '' && !isLight(document.body));
        const questions = main_clone.querySelectorAll(
            '[data-message-author-role="user"]');

        // Background color — unified palette (q_color is hex or 'default'/'none')
        let color_val;
        if(options.q_color === 'none') {
            color_val = 'transparent';
        } else if(options.q_color && options.q_color.startsWith('#')) {
            color_val = options.q_color;
        } else {
            // 'default'
            color_val = isDark ? 'rgba(255,255,255,0.08)' : '#f4f4f4';
        }

        // Alignment: apply inline so these override ChatGPT's external CSS
        // (prevents float/inline-block from letting AI text fill the space
        // beside the prompt block).
        const align = options.q_align || 'left';

        questions.forEach(function(question) {
            // Background
            question.style.backgroundColor = color_val;
            if(color_val === 'unset') {
                question.style.paddingLeft = '0';
                question.style.paddingRight = '0';
            }

            // Block layout — never float
            question.style.float = 'none';
            question.style.clear = 'both';
            question.style.display = 'block';

            // Horizontal position
            if(align === 'right') {
                question.style.marginLeft = 'auto';
                question.style.marginRight = '0';
            } else if(align === 'center') {
                question.style.marginLeft = 'auto';
                question.style.marginRight = 'auto';
            } else if(align === 'justified') {
                question.style.maxWidth = '100%';
                question.style.width = '100%';
                question.style.marginLeft = '0';
                question.style.marginRight = '0';
            } else {
                // left (default)
                question.style.marginLeft = '0';
                question.style.marginRight = 'auto';
            }
        });

        // Foreground (text) color
        if(options.q_fg_color !== 'default') {
            questions.forEach(function(question) {
                question.style.color = options.q_fg_color_picker;
            });
        }

        // Replace CodeMirror blocks only when NOT in blocks-export mode.
        // In blocks mode, only 1-2 blocks may remain so root-finding can
        // walk too far up and erase content.
        const theme = PDFCROWD_THEMES[options.q_color] || PDFCROWD_THEMES['default'];
        if(!main_clone._pdfcrowdBlocksMode) {
            applyDarkCodeBlockStyles(main_clone, isDark, theme);
        }
    }

    function getTriggerButton(event) {
        let trigger = event.target;
        if(trigger.id) {
            localStorage.setItem('pdfcrowd-btn', trigger.id);
        } else {
            const lastBtn = localStorage.getItem('pdfcrowd-btn');
            if(lastBtn) {
                const btnElement = document.getElementById(lastBtn);
                if(btnElement) {
                    trigger = btnElement;
                }
            }
        }
        return trigger;
    }

    function applyConversionOptions(data, trigger, options) {
        const convOptions = JSON.parse(
            trigger.dataset.convOptions || '{}');

        let singlePagePrint = false;
        for(let key in convOptions) {
            const convOptionValue = convOptions[key];
            data[key] = convOptionValue;
            if(key === 'page_height' && convOptionValue === '-1') {
                singlePagePrint = true;
            }
        }

        if(options && options.single_page) {
            data.page_height = '-1';
            singlePagePrint = true;
        }

        if(options && options.page_size) {
            data.page_size = options.page_size;
            // A5 is ~70% the width of A4. Scale viewport so text appears the same
            // physical size (same pt), not shrunk to fit a smaller page.
            if(options.page_size === 'a5' && data.viewport_width) {
                data.viewport_width = Math.round(data.viewport_width * 0.7);
            }
        }
        if(options && options.orientation === 'landscape') {
            data.orientation = 'landscape';
        }

        if(!('viewport_width' in convOptions)) {
            data.viewport_width = 800;
        }

        return singlePagePrint;
    }

    function applyMarginSettings(data, options) {
        switch(options.margins) {
        case 'minimal':
            data.no_margins = true;
            break;
        case 'custom':
            data.margin_left = options.margin_left || 0;
            data.margin_right = options.margin_right || 0;
            data.margin_top = options.margin_top || 0;
            data.margin_bottom = options.margin_bottom || 0;
            break;
        default:
            data.margin_bottom = '12px';
        }
    }

    function buildCssClasses(options, singlePagePrint) {
        let classes = singlePagePrint ? 'pdfcrowd-single-page ' : '';

        if(options.theme === 'dark' ||
           (options.theme === '' && !isLight(document.body))) {
            classes += 'pdfcrowd-dark ';
        }

        if(options.no_questions) {
            classes += 'pdfcrowd-no-questions ';
        }

        if(options.no_icons) {
            classes += 'pdfcrowd-no-icons ';
        }

        if(options.page_break === 'after' && !singlePagePrint) {
            classes += 'pdfcrowd-break-after ';
        }

        // q_align and q_rounded removed — prompt is always right-aligned
        // via custom_css, no need for class-based alignment

        if(options.toc && !options.no_questions) {
            if(options.toc === 'numbering') {
                classes += 'pdfcrowd-use-toc-numbering ';
            }
        }

        return classes;
    }

    // Max chars for the PDF title — longer titles are truncated with …
    const TITLE_MAX_CHARS = 80;

    function truncateTitle(t) {
        return t.length > TITLE_MAX_CHARS
            ? t.slice(0, TITLE_MAX_CHARS - 1) + '…'
            : t;
    }

    // Newspaper-style header — all styling via inline styles (no <style> tag)
    // to stay compatible with PDFCrowd's strict HTML parser.
    function buildNewspaperHeader(options) {
        const leftParts = [];
        const rightParts = [];

        if(options.model_name) {
            const mel = document.querySelector('#page-header .text-lg');
            if(mel) {
                const mn = extractModelName(mel);
                if(mn) leftParts.push(mn);
            }
        }

        if(options.datetime_format && options.datetime_format !== 'none') {
            const now = new Date();
            rightParts.push(
                options.datetime_format === 'date_only'
                    ? now.toLocaleDateString()
                    : now.toLocaleString()
            );
        }

        if(options.source_link) {
            const url = window.location.href;
            const m = url.match(/\/c\/([a-f0-9-]+)/i);
            const display = m
                ? 'chatgpt.com/c/' + m[1].slice(0, 8) + '...'
                : url.replace(/^https?:\/\//, '').slice(0, 45) + '...';
            rightParts.push(
                '<a href="' + url + '" style="color:#888;text-decoration:none">' +
                display + '</a>'
            );
        }

        if(!leftParts.length && !rightParts.length) return '';

        const metaStyle =
            'display:flex;justify-content:space-between;align-items:baseline;' +
            'font-size:11px;color:#888;margin-bottom:4px;font-family:inherit';
        const ruleHStyle =
            'border:none;border-top:2px solid #1a1a1a;margin:3px 0 5px';
        const ruleLStyle =
            'border:none;border-top:1px solid #d0d0d0;margin:5px 0 18px';

        return (
            '<div style="' + metaStyle + '">' +
                '<span>' + leftParts.join(' &middot; ') + '</span>' +
                '<span>' + rightParts.join(' &middot; ') + '</span>' +
            '</div>' +
            '<hr style="' + ruleHStyle + '">'
        );
    }

    // The light rule placed after the h1
    function buildRuleLHtml() {
        return '<hr style="border:none;border-top:1px solid #d0d0d0;margin:5px 0 18px">';
    }

    // Builds a client-side TOC from user prompts (1 prompt = 1 entry).
    // Assigns anchor IDs to each user message element.
    // No page numbers (not available client-side).
    // Removes ChatGPT UI elements that should not appear in the PDF.
    function cleanupForPdf(clone) {

        // ── 0. Remove accessibility-only elements (sr-only) that are hidden
        //       in browser via CSS but render as visible text in PDF.
        //       This is where "Вы сказали:" / "ChatGPT сказал:" labels live.
        clone.querySelectorAll('.sr-only').forEach(function(el) { el.remove(); });
        clone.classList.remove('chat-gpt-custom');

        // ── 1. KaTeX double formula fix ───────────────────────────────────
        // katex-mathml is a hidden fallback text; katex-html is the visual.
        // Without KaTeX CSS, both render → duplicate. Remove the text one.
        clone.querySelectorAll('.katex-mathml').forEach(function(el) {
            el.remove();
        });

        // ── 2. Code block toolbars ────────────────────────────────────────
        // Keep language label (first child of toolbar), remove buttons only
        clone.querySelectorAll('pre .sticky button').forEach(function(el) {
            el.remove();
        });
        clone.querySelectorAll('pre .sticky [class*="justify-self-end"]').forEach(
            function(el) { el.remove(); }
        );
        clone.querySelectorAll('pre button').forEach(function(el) {
            el.remove();
        });

        // ── 3. All UI buttons outside markdown/pre ────────────────────────
        // Removes: message action rows (copy/like/share/edit),
        //          image edit buttons, and any other stray buttons.
        clone.querySelectorAll('button').forEach(function(el) {
            if(!el.closest('.markdown') && !el.closest('pre')) {
                el.remove();
            }
        });

        // ── 4. File upload inputs ─────────────────────────────────────────
        clone.querySelectorAll('input[type="file"], input[type="submit"]')
            .forEach(function(el) { el.remove(); });
        // Remove ChatGPT disclaimer — only SHORT leaf-like elements outside turns
        clone.querySelectorAll('div, p').forEach(function(el) {
            const text = el.textContent.trim();
            if(!el.closest('[data-testid^="conversation-turn"]') &&
               text.length < 200 && text.length > 10 &&
               el.children.length < 3 &&
               (text.includes('допускать ошибки') ||
                text.includes('can make mistakes'))) {
                el.remove();
            }
        });

        // ── 4b. Image gallery: remove aspect-ratio inline styles ─────────
        clone.querySelectorAll('.no-scrollbar [style*="aspect-ratio"]').forEach(
            function(el) {
                el.style.removeProperty('aspect-ratio');
            }
        );

        // ── 4c. Table header alignment — match data cells (not browser center) ──
        clone.querySelectorAll('th').forEach(function(th) {
            const align = th.style.textAlign || 'left';
            th.style.setProperty('text-align', align, 'important');
        });

        // ── 5. Table copy-button overlay ──────────────────────────────────
        clone.querySelectorAll(
            '.TyagGW_tableWrapper .relative.h-0, ' +
            '.TyagGW_tableWrapper .select-none'
        ).forEach(function(el) { el.remove(); });

        // ── 6. Table container background → transparent ───────────────────
        clone.querySelectorAll(
            '[class*="tableContainer"],[class*="tableWrapper"]'
        ).forEach(function(el) {
            el.style.background = 'transparent';
        });

        // ── 7. Orphaned SVG <use> icon containers outside content ─────────
        // Empty icon rows that appear as groups of white squares
        clone.querySelectorAll('[data-testid^="conversation-turn"] svg').forEach(
            function(el) {
                if(!el.closest('.markdown') && !el.closest('pre')) {
                    const parent = el.parentElement;
                    if(parent && parent.tagName !== 'BUTTON') el.remove();
                }
            }
        );

        // ── 8. Our block-selection UI ─────────────────────────────────────
        clone.querySelectorAll('.pdfcrowd-block-cb, .pdfcrowd-img-sel-row')
            .forEach(function(el) { el.remove(); });
        clone.querySelectorAll('[data-pdfcrowd-bid]').forEach(function(el) {
            el.classList.remove('pdfcrowd-block-sel', 'pdfcrowd-block-checked');
            el.removeAttribute('data-pdfcrowd-bid');
        });

        // ── 9. Lock image dimensions from live DOM snapshot ───────────────
        // ChatGPT's stylesheets (not exported) constrain inline icons/favicons
        // to 16–20px. Without them, images render at natural/intrinsic size.
        // We saved bounding-rect dimensions on the originals (data-pdfcrowd-w/h);
        // apply them now as inline styles so the clone inherits them.
        clone.querySelectorAll('img[data-pdfcrowd-w]').forEach(function(img) {
            if(img.closest('.no-scrollbar')) return;
            const w = img.getAttribute('data-pdfcrowd-w');
            const h = img.getAttribute('data-pdfcrowd-h');
            if(w && h) {
                img.style.width = w + 'px';
                img.style.height = h + 'px';
                img.style.maxWidth = w + 'px';
            }
            img.removeAttribute('data-pdfcrowd-w');
            img.removeAttribute('data-pdfcrowd-h');
        });
    }

    function buildTocHtml(options, mainClone) {
        if(!options.toc || options.no_questions) return '';
        if(!mainClone) return '';

        const isRu = (navigator.language || '').toLowerCase().startsWith('ru');
        const userMsgs = mainClone.querySelectorAll(
            '[data-message-author-role="user"]');
        const entries = [];
        let counter = 0;

        userMsgs.forEach(function(msg) {
            const text = msg.textContent.trim().replace(/\s+/g, ' ');
            if(!text) return;

            const id = 'toc-q-' + (++counter);
            msg.setAttribute('id', id);

            // Truncate long prompts
            const display = text.length > 80
                ? text.slice(0, 77) + '...'
                : text;

            const marker = options.toc === 'numbering'
                ? '<span style="color:#aaa;flex-shrink:0;font-size:11px;min-width:16px;text-align:right">' + counter + '.</span>'
                : '<span style="color:#aaa;flex-shrink:0;font-size:11px">&#x25CF;</span>';
            entries.push(
                '<li style="list-style:none;padding:3px 0;display:flex;align-items:baseline;gap:8px">' +
                marker +
                '<a href="#' + id + '" style="text-decoration:none;' +
                'color:#333;font-size:13px">' +
                display.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                '</a></li>'
            );
        });

        if(!entries.length) return '';

        const title = isRu ? 'Содержание' : 'Contents';

        return '<div style="margin-bottom:28px">' +
            '<p style="font-size:15px;font-weight:700;margin:0 0 6px">' +
            title + '</p>' +
            '<hr style="border:none;border-top:1px solid #ccc;margin:0 0 8px">' +
            '<ul style="margin:0;padding:0">' + entries.join('') + '</ul>' +
            '<hr style="border:none;border-top:1px solid #ccc;margin:10px 0 0">' +
            '</div>';
    }

    function buildDatetimeHtml(options) {
        if(options.datetime_format &&
            options.datetime_format !== 'none') {
            const now = new Date();
            const datetimeStr =
                  options.datetime_format === 'date_only'
                  ? now.toLocaleDateString()
                  : now.toLocaleString();
            return `<div class="pdfcrowd-datetime">${datetimeStr}</div>`;
        }
        return '';
    }

    function extractModelName(element) {
        function traverse(node) {
            let text = '';

            node.childNodes.forEach(child => {
                let childText = '';
                if (child.nodeType === Node.TEXT_NODE) {
                    childText = child.textContent.trim();
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    childText = traverse(child);
                }

                if(childText) {
                    if(text) {
                        text += ' - ';
                    }
                    text += childText;
                }
            });

            return text;
        }

        return traverse(element).trim();
    }

    function buildModelNameHtml(options) {
        if(options.model_name) {
            const model_el = document.querySelector(
                '#page-header .text-lg');
            if(model_el) {
                return '<div class="pdfcrowd-model-name">' +
                    extractModelName(model_el) +
                    '</div>';
            }
        }
        return '';
    }

    function buildSourceLinkHtml(options) {
        if(options.source_link) {
            const source = window.location.href;
            return `<div class="pdfcrowd-source-link">Source: <a href="${source}">${source}</a></div>`;
        }
        return '';
    }


    // ── Virtualized-scroll harvest (ports original PDFCrowd approach) ────────

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

    // ── DISABLED old attempt (kept for reference) ─────────────────────────
    /*
    function findScrollContainer(root) {
        const msg = document.querySelector('[data-message-author-role]');
        const candidates = [];

        if (msg) {
            // Collect all scrollable ancestors of the first message node
            let el = msg.parentElement;
            while (el && el !== document.documentElement) {
                const ov = window.getComputedStyle(el).overflowY;
                const scrollable = (ov === 'scroll' || ov === 'auto') &&
                    el.scrollHeight > el.clientHeight + 30;
                if (scrollable) {
                    candidates.push(el);
                }
                el = el.parentElement;
            }
        }

        // Also check root's direct scrollable children (fallback)
        if (candidates.length === 0) {
            const divs = root.querySelectorAll('div');
            for (let i = 0; i < divs.length; i++) {
                const el = divs[i];
                const ov = window.getComputedStyle(el).overflowY;
                if ((ov === 'scroll' || ov === 'auto') &&
                        el.scrollHeight > el.clientHeight + 30) {
                    candidates.push(el);
                    if (candidates.length >= 5) break;
                }
            }
        }

        if (candidates.length === 0) return root;

        // Prefer the candidate with the highest scrollTop (most scrolled),
        // or if all are 0, the one with the largest scrollHeight ratio
        let best = candidates[0];
        for (let i = 1; i < candidates.length; i++) {
            const c = candidates[i];
            if (c.scrollTop > best.scrollTop) { best = c; continue; }
            if (c.scrollTop === best.scrollTop &&
                    c.scrollHeight / (c.clientHeight || 1) >
                    best.scrollHeight / (best.clientHeight || 1)) {
                best = c;
            }
        }

        console.log('[pdfcrowd] scroll container:', best,
            'scrollTop:', best.scrollTop,
            'scrollHeight:', best.scrollHeight,
            'clientHeight:', best.clientHeight);
        return best;
    }

    // Scroll to the top of the conversation so ChatGPT loads all older
    // messages into the DOM, then call onDone(). prepareContent() clones
    // the full DOM tree so scroll position at capture time doesn't matter —
    // we just need all message nodes to exist.
    //
    // Strategy:
    //   1. Snap to scrollTop=0 so older messages get injected into DOM.
    //   2. Poll [data-message-author-role] count; once stable for 1 s → done.
    //   3. Hard safety cutoff at 25 s.
    //   4. If the chat is already at the top AND count never grows → done in ~1 s.
    function autoScrollAndCapture(main, onDone) {
        const scrollEl = findScrollContainer(main);
        const savedPos = scrollEl.scrollTop;
        const hasScrollableContent =
            scrollEl.scrollHeight > scrollEl.clientHeight + 100;

        console.log('[pdfcrowd] autoScroll: savedPos=' + savedPos +
            ' hasScrollableContent=' + hasScrollableContent);

        // No real scroll container found — proceed immediately
        if (!hasScrollableContent) {
            onDone();
            return;
        }

        // Already at (or very near) the top — do a quick 1 s poll to check
        // whether new messages appear; if not, proceed right away.
        const alreadyAtTop = savedPos < 50;

        // Semi-transparent overlay hides the scroll jump from the user
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;' +
            'z-index:2147483640;background:rgba(255,255,255,0.55);' +
            'pointer-events:none;transition:opacity 0.3s';
        document.body.appendChild(overlay);

        // Toast for long chats (shown after 5 s) — skipped if already at top
        let toast = null;
        const isRu = (navigator.language || '').toLowerCase().startsWith('ru');
        const toastTimer = alreadyAtTop ? null : setTimeout(function() {
            toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;' +
                'transform:translateX(-50%);background:rgba(30,30,30,0.88);' +
                'color:#fff;font-size:14px;line-height:1.5;' +
                'padding:12px 22px;border-radius:10px;' +
                'z-index:2147483647;pointer-events:none;white-space:nowrap';
            toast.textContent = isRu
                ? 'Загружаем чат полностью, подождите…'
                : 'Loading the full chat, please wait…';
            document.body.appendChild(toast);
        }, 5000);

        let finished = false;
        // Short timeout if already at top (2 s), full timeout otherwise (25 s)
        const safetyTimer = setTimeout(
            function() { finish(); },
            alreadyAtTop ? 2000 : 25000
        );

        function finish() {
            if (finished) return;
            finished = true;
            clearTimeout(safetyTimer);
            if (toastTimer) clearTimeout(toastTimer);
            if (toast) { toast.remove(); toast = null; }
            overlay.style.opacity = '0';
            setTimeout(function() { overlay.remove(); }, 300);
            console.log('[pdfcrowd] autoScroll done, msg count:',
                document.querySelectorAll('[data-message-author-role]').length);
            onDone();
        }

        // Jump to top — triggers ChatGPT to prepend older messages
        scrollEl.scrollTop = 0;

        // Poll until the DOM message count stops growing
        let lastCount = document.querySelectorAll(
            '[data-message-author-role]').length;
        let stableTicks = 0;
        // Need 4 consecutive stable ticks (1 s) to declare "done"
        const STABLE_NEEDED = 4;

        console.log('[pdfcrowd] initial msg count:', lastCount);

        function waitForStable() {
            const count = document.querySelectorAll(
                '[data-message-author-role]').length;
            if (count !== lastCount) {
                lastCount = count;
                stableTicks = 0;
                console.log('[pdfcrowd] msg count grew to', count);
            } else {
                stableTicks++;
            }
            if (stableTicks >= STABLE_NEEDED) {
                finish();
            } else {
                setTimeout(waitForStable, 250);
            }
        }

        // Give ChatGPT a moment to start loading before we begin polling
        setTimeout(waitForStable, 350);
    }
    */

    // ─────────────────────────────────────────────────────────────────────
<<<<<<< Updated upstream

    async function convert(event) {
=======
    // Rate Us state
    let pcrRateUsMode = false;
    let pcrDropdownOpen = false;
    // ─────────────────────────────────────────────────────────────────────

    async function convert(event) {
        // Rate Us intercept: open dropdown instead of exporting
        if(pcrRateUsMode) {
            if(!pcrDropdownOpen) pcrOpenDropdown();
            return;
        }

>>>>>>> Stashed changes
        document.getElementById('pdfcrowd-extra-btns').classList.add(
            'pdfcrowd-hidden');

        const btnConvert = document.getElementById(
            'pdfcrowd-convert-main');
        btnConvert.disabled = true;
        const spinner = document.getElementById('pdfcrowd-spinner');
        spinner.classList.remove('pdfcrowd-hidden');
        const btnElems = document.getElementsByClassName(
            'pdfcrowd-btn-content');
        for(let i = 0; i < btnElems.length; i++) {
            btnElems[i].classList.add('pdfcrowd-invisible');
        }

        function restoreButtonState() {
            btnConvert.disabled = false;
            spinner.classList.add('pdfcrowd-hidden');
            for(let i = 0; i < btnElems.length; i++) {
                btnElems[i].classList.remove('pdfcrowd-invisible');
            }
        }

        // Harvest all virtualized turns before cloning the DOM
        const selection = window.getSelection();
        const hasSelection = selection &&
            !selection.isCollapsed && selection.rangeCount > 0;
        let turnCache = null;
        if(!hasSelection) {
            try {
                turnCache = await harvestVirtualizedTurns();
            } catch(e) {
                turnCache = null;
            }
        }
        if(harvestCancelled) {
            restoreButtonState();
            return;
        }

        pdfcrowdShared.getOptions(function(options) {
            let main = document.getElementsByTagName('main');
            main = main.length ? main[0] :
                document.querySelector('div.grow');

            // Lock computed image sizes from live DOM so icons/favicons
            // keep their ChatGPT-rendered dimensions after CSS is stripped.
            main.querySelectorAll('img').forEach(function(img) {
                if(img.closest('.no-scrollbar')) return; // gallery handled separately
                const rect = img.getBoundingClientRect();
                if(rect.width > 0 && rect.height > 0) {
                    img.setAttribute('data-pdfcrowd-w', Math.round(rect.width));
                    img.setAttribute('data-pdfcrowd-h', Math.round(rect.height));
                }
            });

            const main_clone = prepareContent(main);
            restoreVirtualizedTurns(main_clone, turnCache);
            cleanupForPdf(main_clone);

            applyQuestionStyles(main_clone, options);

            let title = getTitle();
            let filename = title;

            const cleanup = restoreButtonState;

            function doConvert() {
                // Resolve theme and dark mode before building data object
                const theme = PDFCROWD_THEMES[options.q_color] || PDFCROWD_THEMES['default'];
                const isDarkMode = options.theme === 'dark' ||
                    (options.theme === '' && !isLight(document.body));

                // Replace <input type="checkbox"> with themed styled spans
                // (accent-color CSS not supported by PDFCrowd renderer)
                main_clone.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
                    const checked = cb.checked || cb.hasAttribute('checked');
                    const box = document.createElement('span');
                    if(checked) {
                        box.style.cssText =
                            'display:inline-block;width:0.85em;height:0.85em;' +
                            'border:1.5px solid ' + theme.accent + ';border-radius:2px;' +
                            'background:' + theme.accent + ';vertical-align:middle;' +
                            'margin-right:4px;text-align:center;line-height:0.85em;' +
                            'color:white;font-size:0.75em;font-weight:700';
                        box.textContent = '✓';
                    } else {
                        box.style.cssText =
                            'display:inline-block;width:0.85em;height:0.85em;' +
                            'border:1.5px solid #ccc;border-radius:2px;' +
                            'background:white;vertical-align:middle;margin-right:4px';
                    }
                    cb.parentNode.replaceChild(box, cb);
                });

                const data = {
                    jpeg_quality: 70,
                    image_dpi: 150,
                    convert_images_to_jpeg: 'all',
                    title: title,
                    rendering_mode: 'viewport',
                    smart_scaling_mode: 'viewport-fit',
                    viewport_width: 1300,
                    custom_css: [
                        // ── Hide sr-only elements (accessibility labels) ──
                        '.sr-only{display:none !important}',
                        // ── Base font ────────────────────────────────────
                        'body,p,li,td,th,blockquote,div{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif !important}',
                        'h1,h2,h3,h4,h5,h6{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif !important}',
                        // ── Tables ──────────────────────────────────────
                        'table{border-collapse:collapse !important;width:100% !important;border:1px solid #e5e7eb !important}',
                        'td{border:none !important;border-bottom:1px solid #e5e7eb !important;border-right:1px solid #e5e7eb !important;padding:8px 12px !important}',
                        'td:last-child{border-right:none !important}',
                        'th:last-child{border-right:none !important}',
                        '[class*="tableContainer"],[class*="tableWrapper"]{background:transparent !important}',
                        // ── Code blocks ──────────────────────────────────
                        '.bg-token-bg-elevated-secondary{background-color:' + theme.codeBg + ' !important;color:#111 !important}',
                        'pre .sticky svg{display:none !important}',
                        // ── KaTeX ────────────────────────────────────────
                        '.katex-mathml{display:none !important}',
                        '.katex-display{display:block !important;text-align:center !important;margin:1em 0 !important}',
                        '.katex-html .mathnormal,.katex-html .mathit{font-style:italic !important;font-family:"Times New Roman",Georgia,serif !important}',
                        // ── User prompt bubble ────────────────────────────
                        '[data-message-author-role="user"]{background:transparent !important;display:flex !important;justify-content:flex-end !important;padding:0 !important;margin:4px 0 12px !important}',
                        '[data-message-author-role="user"]>div{background:' + (isDarkMode ? theme.darkPromptBg : theme.promptBg) + ' !important;color:' + (isDarkMode ? '#e8e8e8' : theme.promptText) + ' !important;border-radius:16px !important;padding:8px 14px !important;max-width:70% !important;min-width:0 !important}',
                        'th{background-color:' + theme.tableHeader + ' !important;font-weight:600 !important;border:none !important;border-bottom:2px solid #d1d5db !important;border-right:1px solid #e5e7eb !important;padding:8px 12px !important}',
                        'blockquote{border-left:4px solid ' + theme.blockquote + ' !important;margin:8px 0 !important;padding:4px 0 4px 16px !important;background:none !important;font-style:normal !important}',
                        // ── Remove labels ─────────────────────────────────
                        '.pdfcrowd-user-label,.pdfcrowd-ai-label{display:none !important}',
                        '[data-message-author-role]::before,[data-message-author-role]::after{content:"" !important;display:none !important}',
                        '.chat-gpt-custom [data-message-author-role]::before,.chat-gpt-custom [data-message-author-role]::after{content:"" !important;display:none !important}',
                        // ── Image gallery — 3 per row, rounded, no borders ─
                        '.no-scrollbar{display:flex !important;flex-direction:row !important;flex-wrap:nowrap !important;gap:8px !important;overflow:visible !important;margin-bottom:12px !important}',
                        '.no-scrollbar>div{width:200px !important;height:140px !important;min-width:0 !important;flex-shrink:0 !important;border:none !important;border-radius:10px !important;overflow:hidden !important;aspect-ratio:unset !important}',
                        '.no-scrollbar>div>div,.no-scrollbar button{width:100% !important;height:100% !important;display:block !important}',
                        '.no-scrollbar img{width:100% !important;height:100% !important;object-fit:cover !important;border-radius:10px !important;border:none !important;display:block !important}'
                    ].concat(isDarkMode ? [
                        // ── Dark mode overrides ───────────────────────────
                        'body,html{background:#212121 !important;color:#e8e8e8 !important}',
                        'h1,h2,h3,h4,h5,h6{color:#ffffff !important}',
                        'p,li,span,div{color:#e8e8e8}',
                        'th{background:#2a2a2a !important;color:#ffffff !important;border-color:#3d3d3d !important}',
                        'td{border-color:#3d3d3d !important;color:#e8e8e8 !important}',
                        'table{border-color:#3d3d3d !important;background:#212121 !important}',
                        'a{color:#7ab8f5 !important}',
                        'blockquote{border-left-color:' + theme.accent + ' !important;color:#c8c8c8 !important}',
                        '.main-title{color:#ffffff !important}',
                        '.bg-token-bg-elevated-secondary{background-color:#1e1e1e !important;color:#e8e8e8 !important}',
                        '[data-pdfcrowd-code-block]{background:#1e1e1e !important}'
                    ] : []).join(' ')
                };

                const trigger = getTriggerButton(event);
                const singlePagePrint = applyConversionOptions(
                    data,
                    trigger,
                    options
                );
                applyMarginSettings(data, options);

                const classes = buildCssClasses(options, singlePagePrint);
                if(isDarkMode) {
                    data.page_background_color = '212121';
                }

                if(options.zoom) {
                    data.scale_factor = options.zoom;
                }

                const toc = buildTocHtml(options, main_clone);
                const h1Hidden = options.title_mode === 'none' ? 'display:none;' : '';
                const displayTitle = title.length > 80
                    ? title.slice(0, 79) + '...' : title;

                // Newspaper header: meta row → heavy rule → title → light rule
                const metaRow = buildNewspaperHeader(options);
                const direction = document.documentElement.getAttribute(
                    'dir') || 'ltr';

                const body =
                    metaRow +
                    (metaRow ? '<hr style="border:none;border-top:2px solid #1a1a1a;margin:3px 0 5px">' : '') +
                    `<h1 class="main-title" style="${h1Hidden}font-size:26px;font-weight:700;margin:6px 0;line-height:1.22">` +
                    `${displayTitle}</h1>` +
                    buildRuleLHtml() +
                    toc +
                    main_clone.outerHTML;

                const htmlContent = `<!DOCTYPE html><html><head>` +
                    `<meta charSet="utf-8"/></head>` +
                    `<body class="${classes}" dir="${direction}">` +
                    `${body}</body>`;

                pdfcrowdChatGPT.doRequest(
                    htmlContent,
                    data,
                    addPdfExtension(filename),
                    cleanup
                );
            }

            if(options.title_mode === 'ask') {
                const dlgTitle = document.getElementById(
                    'pdfcrowd-title-overlay');
                const titleInput = document.getElementById('pdfcrowd-title');
                titleInput.value = title;
                dlgTitle.style.display = 'flex';
                titleInput.focus();
                document.getElementById('pdfcrowd-title-convert')
                    .onclick = function() {
                        dlgTitle.style.display = 'none';
                        title = titleInput.value.trim();
                        if(title) {
                            filename = title;
                        }
                        doConvert();
                    };
                const titleCancelBtns = dlgTitle.querySelectorAll(
                    '.pdfcrowd-close-btn');
                titleCancelBtns.forEach(btn => {
                    btn.onclick = function() {
                        dlgTitle.style.display = 'none';
                        cleanup();
                    };
                });
            } else {
                doConvert();
            }
        });
    }

    function addPdfcrowdBlock() {
        const container = document.createElement('div');
        container.innerHTML = pdfcrowdBlockHtml;
        container.classList.add(
            'pdfcrowd-block', 'pdfcrowd-text-right', 'pdfcrowd-hidden');
        document.body.appendChild(container);

        let buttons = document.querySelectorAll('.pdfcrowd-convert');
        buttons.forEach(element => {
            element.addEventListener('click', convert);
        });

        document.getElementById('pdfcrowd-cancel-loading')
            .addEventListener('click', requestHarvestCancel);

        // ── Star rating widget ────────────────────────────────────────────
        const starsEl = document.getElementById('pdfcrowd-stars');
        if(starsEl) {
            const stars = starsEl.querySelectorAll('.pdfcrowd-star');
            stars.forEach(function(s) {
                s.addEventListener('click', function() {
                    const n = parseInt(s.dataset.n);
                    const url = n >= 4
                        ? (pdfcrowdShared.rateUsLink || '#')
                        : (pdfcrowdShared.feedbackFormLink || pdfcrowdShared.rateUsLink || '#');
                    window.open(url, '_blank');
                });
            });
        }

        document.getElementById('pdfcrowd-more').addEventListener('click', event => {
            event.stopPropagation();
            const moreButtons = document.getElementById(
                'pdfcrowd-extra-btns');
            if(moreButtons.classList.contains('pdfcrowd-hidden')) {
                moreButtons.classList.remove('pdfcrowd-hidden');
            } else {
                moreButtons.classList.add('pdfcrowd-hidden');
            }
        });

        document.addEventListener('click', event => {
            const moreButtons = document.getElementById('pdfcrowd-extra-btns');

            if (!moreButtons.contains(event.target)) {
                moreButtons.classList.add('pdfcrowd-hidden');
            }
        });

        buttons = document.querySelectorAll('.pdfcrowd-close-btn');
        buttons.forEach(element => {
            element.addEventListener('click', () => {
                element.closest('.pdfcrowd-overlay').style.display = 'none';
            });
        });

        return container;
    }

    const pdfcrowd_block = addPdfcrowdBlock();

<<<<<<< Updated upstream
=======
    // ── Rate Us dropdown ──────────────────────────────────────────────────
    function pcrShowRateUs() {
        pcrRateUsMode = true;
        document.getElementById('pdfcrowd-btn-left').style.display = 'none';
        document.getElementById('pdfcrowd-more').style.display = 'none';
        document.getElementById('pcr-rateus-face').style.display = 'flex';
    }

    function pcrRevertToExport() {
        pcrRateUsMode = false;
        pcrDropdownOpen = false;
        document.getElementById('pdfcrowd-btn-left').style.display = '';
        document.getElementById('pdfcrowd-more').style.display = '';
        document.getElementById('pcr-rateus-face').style.display = 'none';
        document.getElementById('pcr-rateus-dropdown').style.display = 'none';
    }

    function pcrOpenDropdown() {
        pcrDropdownOpen = true;
        document.getElementById('pcr-rateus-dropdown').style.display = 'flex';
    }

    function pcrCloseDropdown() {
        pcrDropdownOpen = false;
        document.getElementById('pcr-rateus-dropdown').style.display = 'none';
        // revert button to Export immediately (per spec: outside click → back to Export)
        pcrRevertToExport();
    }

    // Hook into saveBlob — fires on every successful export
    const _pcrOrigSaveBlob = pdfcrowdChatGPT.saveBlob;
    pdfcrowdChatGPT.saveBlob = function(url, filename) {
        _pcrOrigSaveBlob.call(this, url, filename);
        chrome.storage.local.get('pcr_rated', function(r) {
            if(!r.pcr_rated) pcrShowRateUs();
        });
    };

    // Star click → open URL, mark rated, revert to Export
    document.querySelectorAll('#pcr-dropdown-stars .pdfcrowd-star').forEach(function(s) {
        s.addEventListener('click', function(e) {
            e.stopPropagation();
            const n = parseInt(s.dataset.n);
            const url = n >= 4
                ? (pdfcrowdShared.rateUsLink || '#')
                : (pdfcrowdShared.feedbackFormLink || pdfcrowdShared.rateUsLink || '#');
            chrome.storage.local.set({ pcr_rated: true });
            pcrRevertToExport();
            window.open(url, '_blank');
        });
    });

    // Click outside → close dropdown and revert to Export
    document.addEventListener('click', function(e) {
        if(!pcrDropdownOpen) return;
        const btn  = document.getElementById('pdfcrowd-convert-main');
        const drop = document.getElementById('pcr-rateus-dropdown');
        if(btn && !btn.contains(e.target) && drop && !drop.contains(e.target)) {
            pcrCloseDropdown();
        }
    });

    // Esc → close dropdown and revert to Export
    document.addEventListener('keydown', function(e) {
        if(e.key === 'Escape' && (pcrRateUsMode || pcrDropdownOpen)) {
            pcrCloseDropdown();
        }
    });
    // ─────────────────────────────────────────────────────────────────────

>>>>>>> Stashed changes
    const BUTTON_MARGIN = -2;
    const WIDTHS = [{
        width: 135,
        cls: null
    }, {
        width: 85,
        cls: 'pdfcrowd-btn-smaller'
    }, {
        width: 58,
        cls: 'pdfcrowd-btn-smallest'
    }, {
        width: 30,
        cls: 'pdfcrowd-btn-xs-small'
    }];

    // Find rightmost visible content inside an element
    function findRightmostContent(container) {
        const elements = container.querySelectorAll('button, a, [role="button"], [type="button"]');
        let rightmost = null;
        let maxRight = 0;

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if(rect.width > 0 && rect.right > maxRight) {
                maxRight = rect.right;
                rightmost = el;
            }
        });

        return rightmost;
    }

    let prevClass = null;

    function changeButtonPosition() {
        const header = document.getElementById('page-header');

        if(header) {
            const children = header.querySelectorAll(':scope > div');
            if(children.length >= 3) {
                const leftContainer = children[1];
                const rightContainer = children[2];
                const leftContent = findRightmostContent(leftContainer);
                const rightRect = rightContainer.getBoundingClientRect();
                const gapEnd = rightRect.left;
                // When the left container is empty (e.g. newer
                // ChatGPT layouts), fall back to the header's
                // left edge so the available-space check still
                // works and the right-sized button is picked.
                const gapStart = leftContent
                    ? leftContent.getBoundingClientRect().right
                    : header.getBoundingClientRect().left;
                const availableSpace = gapEnd - gapStart;

                // Try each button size
                for(let j = 0; j < WIDTHS.length; j++) {
                    const width = WIDTHS[j];
                    if(availableSpace >= width.width + BUTTON_MARGIN * 2) {
                        const rightPos = Math.round(
                            window.innerWidth - gapEnd + BUTTON_MARGIN
                        ) + 'px';
                        const newClass = width.cls;

                        if(rightPos !== pdfcrowd_block.style.right ||
                           prevClass !== newClass) {
                            pdfcrowd_block.style.right = rightPos;
                            pdfcrowd_block.style.top = '10px';
                            prevClass = newClass;
                            pdfcrowd_block.classList.remove(
                                'pdfcrowd-btn-smaller',
                                'pdfcrowd-btn-smallest',
                                'pdfcrowd-btn-xs-small');
                            if(newClass) {
                                pdfcrowd_block.classList.add(newClass);
                            }
                        }
                        return;
                    }
                }
            }
        }

        // Fallback position
        pdfcrowd_block.style.right = '18px';
        pdfcrowd_block.style.top = '44px';
        pdfcrowd_block.classList.remove(
            'pdfcrowd-btn-smaller',
            'pdfcrowd-btn-smallest',
            'pdfcrowd-btn-xs-small');
        pdfcrowd_block.classList.add('pdfcrowd-btn-smaller');
        prevClass = 'pdfcrowd-btn-smaller';
    }

    function checkForContent() {
        const validUrl = !window.location.href.startsWith(
            'https://chatgpt.com/gpts/editor');
        const hasMessages = !!document.querySelector(
            '[data-message-author-role="user"]');
        const mainBtn = document.getElementById('pdfcrowd-convert-main');

        if(validUrl && hasMessages) {
            // ── Normal conversation: full button ──────────────────────────
            changeButtonPosition();
            pdfcrowd_block.classList.remove('pdfcrowd-hidden');

            if(mainBtn) {
                mainBtn.classList.remove('pdfcrowd-no-chat');
                mainBtn.disabled = false;
            }

            // fix conflict with other extensions which remove the button
            if(!pdfcrowd_block.isConnected) {
                console.warn('Extension conflict, another extension deleted PDFCrowd HTML, disable other extensions to fix it.\ncreating the Save as PDF button...');
                document.body.appendChild(pdfcrowd_block);
            }
            if(!blockStyle.isConnected) {
                console.warn('Extension conflict, another extension deleted PDFCrowd HTML, disable other extensions to fix it.\ncreating the button style...');
                document.head.appendChild(blockStyle);
            }

            // ── Welcome ripple: show rings once after install ──────────────
            chrome.storage.local.get('pdfcrowdHighlightBtn', function(result) {
                if(!result.pdfcrowdHighlightBtn) return;
                chrome.storage.local.remove('pdfcrowdHighlightBtn');

                const wrap = pdfcrowd_block;
                // Add three ring divs
                const rings = [1, 2, 3].map(function() {
                    const r = document.createElement('div');
                    r.className = 'pdfcrowd-ring';
                    wrap.appendChild(r);
                    return r;
                });
                // Remove rings after 6 seconds (≈2 full animation cycles)
                setTimeout(function() {
                    rings.forEach(function(r) { r.remove(); });
                }, 6000);
            });

        } else if(validUrl) {
            // ── Home page / no messages: dimmed button with tooltip ────────
            changeButtonPosition();
            pdfcrowd_block.classList.remove('pdfcrowd-hidden');

            if(mainBtn) {
                mainBtn.classList.add('pdfcrowd-no-chat');
                mainBtn.disabled = false; // keep clickable for the tooltip
            }

            if(!pdfcrowd_block.isConnected) {
                document.body.appendChild(pdfcrowd_block);
            }
            if(!blockStyle.isConnected) {
                document.head.appendChild(blockStyle);
            }

        } else {
            pdfcrowd_block.classList.add('pdfcrowd-hidden');
        }
    }

    // ── Tooltip click handler for home-page (no-chat) state ──────────────────
    (function() {
        const mainBtn = document.getElementById('pdfcrowd-convert-main');
        const tooltip = document.getElementById('pdfcrowd-no-chat-tooltip');
        if(!mainBtn || !tooltip) return;

        mainBtn.addEventListener('click', function(e) {
            if(!mainBtn.classList.contains('pdfcrowd-no-chat')) return;
            e.stopPropagation();
            tooltip.classList.add('pdfcrowd-tooltip-visible');
            clearTimeout(mainBtn._tooltipTimer);
            mainBtn._tooltipTimer = setTimeout(function() {
                tooltip.classList.remove('pdfcrowd-tooltip-visible');
            }, 3000);
        }, true); // capture so it fires before the normal convert handler
    })();

// ── Block-selection mode ──────────────────────────────────────────────────────

(function() {
    const blocksBtn = document.getElementById('pdfcrowd-blocks');
    const bar       = document.getElementById('pdfcrowd-blocks-bar');
    const countEl   = document.getElementById('pdfcrowd-blocks-count');
    const exportBtn = document.getElementById('pdfcrowd-blocks-export');
    const cancelBtn = document.getElementById('pdfcrowd-blocks-cancel');
    if(!blocksBtn || !bar) return;

    let inBlockMode    = false;
    let bidCounter     = 0;
    let debounceTimer  = null; // lifted here so exitBlockMode can clear it
    const blockMap     = new Map();
    const selectedBids = new Set();

    // ── helpers ────────────────────────────────────────────────────────────

    function updateBar() {
        const n = selectedBids.size;
        const isRu = (navigator.language || '').toLowerCase().startsWith('ru');
        if(isRu) {
            countEl.textContent = n === 1 ? '1 блок выбран' : n + ' блоков выбрано';
            exportBtn.textContent = 'Экспортировать';
            cancelBtn.textContent = 'Отмена';
        } else {
            countEl.textContent = n === 1 ? '1 block selected' : n + ' blocks selected';
            exportBtn.textContent = 'Export selected';
            cancelBtn.textContent = 'Cancel';
        }
        exportBtn.disabled = (n === 0);
    }

    // Returns all selectable content blocks from the current DOM.
    // • User message  → whole [data-message-author-role="user"] = 1 block
    // • AI message    → each direct child of .markdown (skip hr/script/style)
    function findBlocks() {
        const result = [];
        document.querySelectorAll(
            '[data-testid^="conversation-turn"]'
        ).forEach(function(turn) {
            const userEl = turn.querySelector(
                '[data-message-author-role="user"]');
            if(userEl) {
                result.push(userEl);
                return;
            }
            // AI turn: drill into .markdown container
            const markdown = turn.querySelector('.markdown');
            if(!markdown) return;
            Array.from(markdown.children).forEach(function(child) {
                const tag = child.tagName;
                if(!tag) return;
                if(tag === 'HR' || tag === 'SCRIPT' || tag === 'STYLE') return;
                // Skip our own injected UI elements
                if(child.classList.contains('pdfcrowd-img-sel-row')) return;
                if(child.hasAttribute('data-pdfcrowd-bid')) return;
                result.push(child);
            });
        });
        return result;
    }

    const isRuLang = false; // UI is English-only

    function attachBlock(el) {
        const bid = String(++bidCounter);
        el.setAttribute('data-pdfcrowd-bid', bid);

        // For table containers: outer div is 100% wide but the inner
        // tableWrapper is content-width. Apply visual highlight to inner only
        // so the outline/background don't span the full page width.
        let visualEl = el;
        if(el.querySelector) {
            const tableInner = el.querySelector(
                ':scope > .TyagGW_tableWrapper, :scope > [class*="tableWrapper"]');
            if(tableInner) visualEl = tableInner;
        }
        visualEl.classList.add('pdfcrowd-block-sel');

        const hasImages = !!el.querySelector('img, canvas, video');
        let selRow = null;

        if(hasImages) {
            // For image blocks: insert a dedicated selection row BEFORE the
            // block as a sibling — completely outside the image buttons area.
            selRow = document.createElement('div');
            selRow.className = 'pdfcrowd-img-sel-row';
            selRow.setAttribute('data-pdfcrowd-sel-row', bid);
            selRow.innerHTML =
                '<input type="checkbox" style="width:16px;height:16px;' +
                'accent-color:#EA4C3A;cursor:pointer;flex-shrink:0">' +
                '<span style="font-size:13px;color:#EA4C3A;font-weight:500;' +
                'user-select:none;pointer-events:none">' +
                (isRuLang ? 'Выбрать изображение' : 'Select image block') +
                '</span>';
            if(el.parentElement) {
                el.parentElement.insertBefore(selRow, el);
            }
        }

        // For non-image blocks: floating checkbox in top-right corner of visualEl
        let cb;
        if(!hasImages) {
            const cbWrap = document.createElement('div');
            cbWrap.className = 'pdfcrowd-block-cb';
            cb = document.createElement('input');
            cb.type = 'checkbox';
            cbWrap.appendChild(cb);
            visualEl.appendChild(cbWrap);

        } else {
            cb = selRow.querySelector('input[type=checkbox]');
        }

        function toggle(checked) {
            cb.checked = checked;
            visualEl.classList.toggle('pdfcrowd-block-checked', checked);
            if(selRow) selRow.classList.toggle('pdfcrowd-img-sel-checked', checked);
            if(checked) selectedBids.add(bid);
            else         selectedBids.delete(bid);
            updateBar();
        }

        cb.addEventListener('change', function() { toggle(cb.checked); });

        // For image blocks the selRow handles clicks; for others — the block
        const clickTarget = hasImages ? selRow : el;
        function onBlockClick(e) {
            if(e.target.closest('a, button:not([type]), select, textarea')) return;
            if(e.target.type === 'checkbox') return; // handled by change event
            toggle(!cb.checked);
        }
        clickTarget.addEventListener('click', onBlockClick);

        blockMap.set(bid, {
            el: el,
            visualEl: visualEl,
            selRow: selRow,
            cb: cb,
            clickHandler: onBlockClick,
            clickTarget: clickTarget
        });
    }

    function detachAll() {
        blockMap.forEach(function(info) {
            const el      = info.el;
            const visualEl = info.visualEl;
            info.clickTarget.removeEventListener('click', info.clickHandler);
            el.removeAttribute('data-pdfcrowd-bid');
            visualEl.classList.remove('pdfcrowd-block-sel', 'pdfcrowd-block-checked');
            const cbWrap = visualEl.querySelector('.pdfcrowd-block-cb');
            if(cbWrap) cbWrap.remove();
            if(info.selRow && info.selRow.parentElement) {
                info.selRow.remove();
            }
        });
        blockMap.clear();
        selectedBids.clear();
        bidCounter = 0;
    }

    // ── enter / exit ───────────────────────────────────────────────────────

    let blockModeObserver = null;

    // Attach checkboxes to any unprocessed blocks in current DOM
    function attachVisible() {
        if(!inBlockMode) return; // guard: don't attach if mode was cancelled
        findBlocks().forEach(function(el) {
            if(!el.hasAttribute('data-pdfcrowd-bid')) attachBlock(el);
        });
        updateBar();
    }

    const mainBtn    = document.getElementById('pdfcrowd-convert-main');
    const exitSelBtn = document.getElementById('pdfcrowd-exit-select');

    // Update the Export button label in selection mode
    function updateMainBtnLabel() {
        const btnLabel = mainBtn && mainBtn.querySelector('.pdfcrowd-lg');
        if(!btnLabel) return;
        if(inBlockMode) {
            const n = selectedBids.size;
            btnLabel.textContent = n ? 'Export (' + n + ')' : 'Export (select blocks)';
        } else {
            btnLabel.textContent = 'Export';
        }
    }

    // Override updateBar to also refresh the main button label
    const _origUpdateBar = updateBar;
    updateBar = function() {
        _origUpdateBar();
        updateMainBtnLabel();
    };

    blocksBtn.addEventListener('click', async function() {
        if(inBlockMode) return;

        document.getElementById('pdfcrowd-extra-btns')
            .classList.add('pdfcrowd-hidden');

        // 1. Harvest
        try { await harvestVirtualizedTurns(); } catch(e) {}
        if(harvestCancelled) return;

        inBlockMode = true;
        bidCounter = 0;
        blockMap.clear();
        selectedBids.clear();

        // Show ✕ exit button
        if(exitSelBtn) exitSelBtn.style.display = 'flex';
        updateMainBtnLabel();

        // 2. Scroll to top
        const scroller = findVirtualizedScroller();
        if(scroller) {
            scroller.scrollTop = 0;
            await new Promise(function(r) { setTimeout(r, 450); });
        }

        // 3. Attach blocks
        attachVisible();

        // 4. Watch for new blocks
        blockModeObserver = new MutationObserver(function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(attachVisible, 120);
        });
        blockModeObserver.observe(document.body, {
            childList: true, subtree: true
        });
    });

    function exitBlockMode() {
        if(!inBlockMode) return;
        inBlockMode = false;
        clearTimeout(debounceTimer);
        debounceTimer = null;
        if(blockModeObserver) {
            blockModeObserver.disconnect();
            blockModeObserver = null;
        }
        detachAll();
        bar.classList.remove('pdfcrowd-active');
        if(exitSelBtn) exitSelBtn.style.display = 'none';
        updateMainBtnLabel();
    }

    // ✕ exits selection mode
    if(exitSelBtn) exitSelBtn.addEventListener('click', exitBlockMode);

    // Main Export button — in block mode exports selected, otherwise normal
    if(mainBtn) {
        mainBtn.addEventListener('click', function(e) {
            if(!inBlockMode) return; // normal convert handled elsewhere
            if(selectedBids.size === 0) {
                exitBlockMode();
                return;
            }
            // Intercept: export selected blocks
            e.stopImmediatePropagation();
            exportBtn.click(); // trigger the blocks export handler
        }, true); // capture phase so it fires before convert()
    }

    // ── export ─────────────────────────────────────────────────────────────

    exportBtn.addEventListener('click', function() {
        if(selectedBids.size === 0) return;

        // Snapshot which bids to keep BEFORE detaching
        const bidsToKeep = new Set(selectedBids);

        // Bug #2: show loading overlay during PDF generation
        const ovDiv = document.querySelector('#pdfcrowd-loading-overlay > div:not(.pdfcrowd-spinner)');
        if(ovDiv) ovDiv.textContent = isRuLang ? 'Создаём PDF, подождите…' : 'Creating PDF, please wait…';
        showLoadingOverlay();

        // Hide UI but keep data-pdfcrowd-bid attrs alive for the clone step
        bar.classList.remove('pdfcrowd-active');
        document.querySelectorAll('.pdfcrowd-block-cb').forEach(
            function(w) { w.style.display = 'none'; });
        document.querySelectorAll('.pdfcrowd-block-sel').forEach(function(el) {
            el.classList.remove('pdfcrowd-block-sel', 'pdfcrowd-block-checked');
        });

        pdfcrowdShared.getOptions(function(options) {
            let main = document.getElementsByTagName('main');
            main = main.length ? main[0] : document.querySelector('div.grow');

            // Lock computed image sizes (same as main export path — see step 9 in cleanupForPdf)
            main.querySelectorAll('img').forEach(function(img) {
                if(img.closest('.no-scrollbar')) return;
                const rect = img.getBoundingClientRect();
                if(rect.width > 0 && rect.height > 0) {
                    img.setAttribute('data-pdfcrowd-w', Math.round(rect.width));
                    img.setAttribute('data-pdfcrowd-h', Math.round(rect.height));
                }
            });

            const main_clone = prepareContent(main);
            // turnCache is null — harvest already ran in enterBlockMode
            restoreVirtualizedTurns(main_clone, null);

            // Remove checkbox/selection UI that got cloned
            main_clone.querySelectorAll('.pdfcrowd-block-cb').forEach(
                function(w) { w.remove(); });
            main_clone.querySelectorAll('.pdfcrowd-img-sel-row').forEach(
                function(w) { w.remove(); });

            // Bug #1 fix: mark turns that have at least one selected block
            // BEFORE removing anything (so we can sweep correctly afterward)
            const turnsWithSelection = new Set();
            main_clone.querySelectorAll('[data-pdfcrowd-bid]').forEach(
                function(el) {
                    if(bidsToKeep.has(el.getAttribute('data-pdfcrowd-bid'))) {
                        let node = el.parentElement;
                        while(node) {
                            if(node.matches &&
                               node.matches('[data-testid^="conversation-turn"]')) {
                                turnsWithSelection.add(node);
                                break;
                            }
                            node = node.parentElement;
                        }
                    }
                }
            );

            // Remove non-selected blocks
            main_clone.querySelectorAll('[data-pdfcrowd-bid]').forEach(
                function(el) {
                    const bid = el.getAttribute('data-pdfcrowd-bid');
                    el.removeAttribute('data-pdfcrowd-bid');
                    if(!bidsToKeep.has(bid)) el.remove();
                }
            );

            // Bug #1 fix: remove ALL turns without a selected block
            // (covers virtualised turns restored by cache that had no bids)
            main_clone.querySelectorAll(
                '[data-testid^="conversation-turn"]'
            ).forEach(function(turn) {
                if(!turnsWithSelection.has(turn)) turn.remove();
            });

            // Full cleanup of live DOM
            exitBlockMode();

            // Light cleanup only — avoid aggressive DOM transforms on sparse selection
            main_clone.querySelectorAll('.sr-only').forEach(function(el) { el.remove(); });
            main_clone.classList.remove('chat-gpt-custom');
            main_clone.querySelectorAll('.katex-mathml').forEach(function(el) { el.remove(); });
            main_clone.querySelectorAll('pre button, pre .sticky button').forEach(function(el) { el.remove(); });
            main_clone.querySelectorAll('button').forEach(function(el) {
                if(!el.closest('.markdown') && !el.closest('pre')) el.remove();
            });
            main_clone.querySelectorAll('input[type="file"]').forEach(function(el) { el.remove(); });
            // Remove ChatGPT disclaimer (short leaf element outside turns)
            main_clone.querySelectorAll('p, div').forEach(function(el) {
                const t = el.textContent.trim();
                if(t.length < 150 && t.length > 10 &&
                   el.children.length === 0 &&
                   !el.closest('[data-testid^="conversation-turn"]') &&
                   (t.includes('допускать ошибки') || t.includes('can make mistakes'))) {
                    el.remove();
                }
            });

            const isDark = options.theme === 'dark' ||
                (options.theme === '' && !isLight(document.body));

            const title    = getTitle();
            const data = {
                jpeg_quality: 70,
                image_dpi: 150,
                convert_images_to_jpeg: 'all',
                title: title,
                rendering_mode: 'viewport',
                smart_scaling_mode: 'viewport-fit',
                viewport_width: 1300,
                custom_css: [
                    'body,p,li,td,th,blockquote,div{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif !important}',
                    'h1,h2,h3,h4,h5,h6{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif !important}',
                    'table{border-collapse:collapse !important;width:100% !important;border:1px solid #e5e7eb !important}',
                    'td{border:none !important;border-bottom:1px solid #e5e7eb !important;border-right:1px solid #e5e7eb !important;padding:8px 12px !important}',
                    'td:last-child{border-right:none !important}',
                    'th{background-color:#f4f4f4 !important;font-weight:600 !important;border:none !important;border-bottom:2px solid #d1d5db !important;border-right:1px solid #e5e7eb !important;padding:8px 12px !important}',
                    'th:last-child{border-right:none !important}',
                    '[class*="tableContainer"],[class*="tableWrapper"]{background:transparent !important}',
                    '.bg-token-bg-elevated-secondary{background-color:#f8f8f8 !important;color:#111 !important}',
                    'pre .sticky svg{display:none !important}',
                    '.katex-mathml{display:none !important}',
                    '.katex-display{display:block !important;text-align:center !important;margin:1em 0 !important}',
                    '[data-message-author-role="user"]{background:transparent !important;display:flex !important;justify-content:flex-end !important;padding:0 !important;margin:4px 0 12px !important}',
                    '[data-message-author-role="user"]>div>div:first-child,[data-message-author-role="user"] .whitespace-pre-wrap{background:#f4f4f4 !important;border-radius:16px !important;padding:10px 16px !important;max-width:85% !important;display:inline-block !important}',
                    '.no-scrollbar{display:flex !important;flex-direction:row !important;flex-wrap:nowrap !important;gap:8px !important;overflow:visible !important;margin-bottom:12px !important}',
                    '.no-scrollbar>div{width:200px !important;height:140px !important;flex-shrink:0 !important;border:none !important;border-radius:10px !important;overflow:hidden !important;aspect-ratio:unset !important}',
                    '.no-scrollbar img{width:100% !important;height:100% !important;object-fit:cover !important;border-radius:10px !important;border:none !important}'
                ].join(' ')
            };
            applyMarginSettings(data, options);

            const classes = buildCssClasses(options, false);
            if(isDark) data.page_background_color = '333333';
            if(options.zoom) data.scale_factor = options.zoom;

            const h1Hidden = options.title_mode === 'none' ? 'display:none;' : '';
            const displayTitle = title.length > 80 ? title.slice(0, 79) + '...' : title;
            const metaRow = buildNewspaperHeader(options);
            const direction  = document.documentElement.getAttribute('dir') || 'ltr';

            const body =
                metaRow +
                (metaRow ? '<hr style="border:none;border-top:2px solid #1a1a1a;margin:3px 0 5px">' : '') +
                `<h1 class="main-title" style="${h1Hidden}font-size:26px;font-weight:700;margin:6px 0;line-height:1.22">${displayTitle}</h1>` +
                '<hr style="border:none;border-top:1px solid #d0d0d0;margin:5px 0 18px">' +
                main_clone.outerHTML;

            const htmlContent = `<!DOCTYPE html><html><head>` +
                `<meta charSet="utf-8"/></head>` +
                `<body class="${classes}" dir="${direction}">` +
                `${body}</body>`;

            pdfcrowdChatGPT.doRequest(
                htmlContent, data, addPdfExtension(title), function() {
                    hideLoadingOverlay(); // Bug #2: hide when done
                }
            );
        });
    });
})();


const singlePageBtn = document.getElementById('pdfcrowd-single-page');

if (singlePageBtn) {
    pdfcrowdShared.getOptions(function(options) {
        if(options.single_page) {
            singlePageBtn.classList.add('pdfcrowd-active');
        }
    });

    singlePageBtn.addEventListener('click', function() {
        pdfcrowdShared.getOptions(function(options) {
            options.single_page = !options.single_page;
            chrome.storage.sync.set({options: options});
            if(options.single_page) {
                singlePageBtn.classList.add('pdfcrowd-active');
            } else {
                singlePageBtn.classList.remove('pdfcrowd-active');
            }
        });
    });
}

const aiOnlyBtn = document.getElementById('pdfcrowd-ai-only');

if (aiOnlyBtn) {
    pdfcrowdShared.getOptions(function(options) {
        if(options.no_questions) {
            aiOnlyBtn.classList.add('pdfcrowd-active');
        }
    });

    aiOnlyBtn.addEventListener('click', function() {
        pdfcrowdShared.getOptions(function(options) {

            options.no_questions = !options.no_questions;

            chrome.storage.sync.set({options: options});

            if(options.no_questions) {
                aiOnlyBtn.classList.add('pdfcrowd-active');
            } else {
                aiOnlyBtn.classList.remove('pdfcrowd-active');
            }
        });
    });
}
    const options_el = document.getElementById('pdfcrowd-options');
    if(pdfcrowdShared.hasOptions) {
        options_el.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('pdfcrowd-extra-btns').classList.add('pdfcrowd-hidden');
            pcrOpenSettings();
        });
    } else {
        options_el.remove();
    }

    // ===== Settings Modal Logic =====
    function pcrOpenSettings() {
        const overlay = document.getElementById('pdfcrowd-settings-overlay');
        overlay.style.display = 'flex';
        pdfcrowdShared.getOptions(function(opts) {
            pcrLoadSettings(opts);
            pcrUpdatePreview(opts);
        });
    }

    function pcrCloseSettings() {
        document.getElementById('pdfcrowd-settings-overlay').style.display = 'none';
    }

    function pcrSetSegment(id, value) {
        const el = document.getElementById(id);
        if(!el) return;
        el.querySelectorAll('.pcr-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === value));
    }

    function pcrGetSegment(id) {
        const el = document.getElementById(id);
        if(!el) return '';
        const a = el.querySelector('.pcr-seg-btn.active');
        return a ? a.dataset.value : '';
    }

    function pcrSetSwatch(id, value) {
        const el = document.getElementById(id);
        if(!el) return;
        el.querySelectorAll('.pcr-swatch').forEach(b => b.classList.toggle('active', b.dataset.value === value));
    }

    function pcrGetSwatch(id) {
        const el = document.getElementById(id);
        if(!el) return 'default';
        const a = el.querySelector('.pcr-swatch.active');
        return a ? a.dataset.value : 'default';
    }

    // Expand 3-digit hex (#rgb) to 6-digit (#rrggbb) required by <input type="color">
    function pcrNormalizeColor(color, fallback) {
        if(!color) return fallback || '#000000';
        return color.replace(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/, '#$1$1$2$2$3$3');
    }

    function pcrSetTheme(value) {
        const el = document.getElementById('pcr-theme');
        if(!el) return;
        el.querySelectorAll('.pcr-theme-card').forEach(c => c.classList.toggle('active', c.dataset.value === value));
    }

    function pcrGetTheme() {
        const el = document.getElementById('pcr-theme');
        if(!el) return '';
        const a = el.querySelector('.pcr-theme-card.active');
        return a ? a.dataset.value : '';
    }

    function pcrLoadSettings(opts) {
        pcrSetSegment('pcr-page-size', opts.page_size || 'a4');
        pcrSetSegment('pcr-orientation', opts.orientation || '');
        pcrSetTheme(opts.theme !== undefined ? opts.theme : '');
        const zoom = opts.zoom || 100;
        document.getElementById('pcr-zoom').value = zoom;
        document.getElementById('pcr-zoom-value').textContent = zoom + '%';
        pcrSetSegment('pcr-margins', opts.margins || '');
        document.getElementById('pcr-margin-top').value = opts.margin_top || '0.4in';
        document.getElementById('pcr-margin-bottom').value = opts.margin_bottom || '0.4in';
        document.getElementById('pcr-margin-left').value = opts.margin_left || '0.4in';
        document.getElementById('pcr-margin-right').value = opts.margin_right || '0.4in';
        const customMargins = document.getElementById('pcr-margins-custom');
        if(customMargins) customMargins.style.display = opts.margins === 'custom' ? 'flex' : 'none';
        pcrSetSegment('pcr-page-break', opts.page_break || '');
        const pageBreakRow = document.getElementById('pcr-page-break') && document.getElementById('pcr-page-break').closest('.pcr-row');
        if(pageBreakRow) pageBreakRow.style.display = opts.single_page ? 'none' : '';
        // Theme palette
        const savedTheme = opts.q_color || 'default';
        const qColorInput = document.getElementById('pcr-q-color-value');
        if(qColorInput) qColorInput.value = savedTheme;
        document.querySelectorAll('#pcr-q-palette .pcr-palette-btn').forEach(function(btn) {
            const isActive = btn.getAttribute('data-color') === savedTheme;
            btn.style.outline = isActive ? '2px solid #EA4C3A' : 'none';
            btn.style.outlineOffset = isActive ? '2px' : '';
        });
        const sp = document.getElementById('pcr-single-page'); if(sp) sp.checked = !!opts.single_page;
        pcrSetSegment('pcr-title-mode', opts.title_mode || '');
        pcrSetSegment('pcr-datetime', opts.datetime_format || 'none');
        pcrSetSegment('pcr-toc', opts.toc || '');
        const mn = document.getElementById('pcr-model-name'); if(mn) mn.checked = !!opts.model_name;
        const sl = document.getElementById('pcr-source-link'); if(sl) sl.checked = !!opts.source_link;
    }

    function pcrGetSettings() {
        return {
            page_size: pcrGetSegment('pcr-page-size') || 'a4',
            orientation: pcrGetSegment('pcr-orientation'),
            theme: pcrGetTheme(),
            zoom: parseInt(document.getElementById('pcr-zoom').value) || 100,
            margins: pcrGetSegment('pcr-margins'),
            margin_top: document.getElementById('pcr-margin-top').value,
            margin_bottom: document.getElementById('pcr-margin-bottom').value,
            margin_left: document.getElementById('pcr-margin-left').value,
            margin_right: document.getElementById('pcr-margin-right').value,
            page_break: pcrGetSegment('pcr-page-break'),
            q_color: (document.getElementById('pcr-q-color-value') || {value: 'default'}).value || 'default',
            q_color_picker: '#f4f4f4',
            q_fg_color: 'default',
            q_fg_color_picker: '#333333',
            q_align: 'right',
            q_rounded: true,
            no_icons: true,
            title_mode: pcrGetSegment('pcr-title-mode'),
            datetime_format: pcrGetSegment('pcr-datetime'),
            single_page: !!(document.getElementById('pcr-single-page') || {}).checked,
            toc: pcrGetSegment('pcr-toc'),
            model_name: !!(document.getElementById('pcr-model-name') || {}).checked,
            source_link: !!(document.getElementById('pcr-source-link') || {}).checked,
        };
    }

    function pcrUpdatePreview(opts) {
        const doc = document.getElementById('pcr-preview-doc');
        if(!doc) return;
        const o = opts || pcrGetSettings();

        // Theme: light / dark
        const isDark = o.theme === 'dark' || (o.theme === '' && !isLight(document.body));
        doc.className = isDark ? 'preview-dark' : 'preview-light';

        // Page size: change aspect ratio of the mock document
        const isLandscape = o.orientation === 'landscape';
        const aspectRatio = 1.414; // A4 and A5 share the same √2 ratio
        const docW = o.page_size === 'a5' ? 112 : 152;
        doc.style.width = docW + 'px';
        doc.style.height = isLandscape
            ? Math.round(docW / aspectRatio) + 'px'
            : Math.round(docW * aspectRatio) + 'px';

        // Margins: adjust preview doc padding to give a visual sense of margin size
        if(o.margins === 'minimal') {
            doc.style.padding = '4px 3px';
        } else if(o.margins === 'custom') {
            // rough proportional estimate from custom values
            const parseIn = v => { const n = parseFloat(v); return isNaN(n) ? 0.4 : n; };
            const vPad = Math.round(Math.max(2, parseIn(o.margin_top) * 16));
            const hPad = Math.round(Math.max(2, parseIn(o.margin_left) * 14));
            doc.style.padding = vPad + 'px ' + hPad + 'px';
        } else {
            doc.style.padding = '12px 10px';
        }

        // Font size: scale line heights and gaps — not the doc frame itself
        const zoom = o.zoom || 100;
        const scale = zoom / 100;
        const lineH = Math.max(2, Math.round(3 * (0.6 + scale * 0.4))) + 'px';
        const gap   = Math.max(2, Math.round(2 + scale * 2)) + 'px';
        doc.querySelectorAll('.pcr-prev-line').forEach(l => { l.style.height = lineH; });
        doc.querySelectorAll('.pcr-prev-ai, .pcr-prev-user').forEach(b => { b.style.gap = gap; });

        // User prompt background (theme-aware)
        const users = doc.querySelectorAll('.pcr-prev-user');
        let userBg;
        const themeData = PDFCROWD_THEMES[o.q_color];
        if(o.q_color === 'none') userBg = 'transparent';
        else if(o.q_color === 'custom') userBg = o.q_color_picker || '#ecf9f2';
        else userBg = themeData
            ? (isDark ? themeData.darkPromptBg : themeData.promptBg)
            : (isDark ? 'rgba(255,255,255,0.08)' : '#f0f4f8');

        // Blockquote stripe color
        const bqBar = doc.querySelector('.pcr-prev-bq-bar');
        if(bqBar) {
            bqBar.style.background = themeData ? themeData.blockquote : '#d0d0d0';
        }
        users.forEach(u => {
            u.style.background = userBg;
            u.style.borderRadius = o.q_rounded ? '6px' : '2px';
        });

        // Text color: tint user-block lines with custom colour
        users.forEach(u => {
            u.querySelectorAll('.pcr-prev-line').forEach(l => {
                if(o.q_fg_color === 'custom' && o.q_fg_color_picker) {
                    l.style.background = o.q_fg_color_picker + 'bb';
                } else {
                    l.style.background = '';
                }
            });
        });

        // Alignment: shift user-block lines
        const align = o.q_align || 'justified';
        users.forEach(u => {
            u.querySelectorAll('.pcr-prev-line').forEach(l => {
                if(align === 'center') {
                    l.style.marginLeft = 'auto';
                    l.style.marginRight = 'auto';
                } else if(align === 'right') {
                    l.style.marginLeft = 'auto';
                    l.style.marginRight = '0';
                } else {
                    l.style.marginLeft = '0';
                    l.style.marginRight = 'auto';
                }
            });
        });

        // Page break
        const breakEl = document.getElementById('pcr-prev-break');
        if(breakEl) breakEl.style.display = o.page_break === 'after' ? 'block' : 'none';

        // Title
        const titleEl = doc.querySelector('.pcr-prev-title');
        if(titleEl) titleEl.style.display = o.title_mode === 'none' ? 'none' : 'block';

        // Creation date indicator
        const dateEl = doc.querySelector('.pcr-prev-date');
        if(dateEl) {
            dateEl.style.display = (o.datetime_format && o.datetime_format !== 'none') ? 'block' : 'none';
            dateEl.style.background = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)';
        }

        // Model name indicator
        const modelEl = doc.querySelector('.pcr-prev-model');
        if(modelEl) {
            modelEl.style.display = o.model_name ? 'block' : 'none';
            modelEl.style.background = isDark ? 'rgba(120,180,255,0.35)' : 'rgba(74,144,217,0.3)';
        }

        // Source link indicator
        const sourceEl = doc.querySelector('.pcr-prev-source');
        if(sourceEl) {
            sourceEl.style.display = o.source_link ? 'block' : 'none';
            sourceEl.style.background = isDark ? 'rgba(120,180,255,0.25)' : 'rgba(74,144,217,0.22)';
        }

        // TOC indicator
        const tocEl = doc.querySelector('.pcr-prev-toc');
        if(tocEl) {
            tocEl.style.display = o.toc ? 'flex' : 'none';
            const tocBlue = isDark ? '99,175,255' : '74,144,217';
            const isNumbered = o.toc === 'numbering';
            tocEl.querySelectorAll('.pcr-toc-dot').forEach((el, i) => {
                const color = `rgba(${tocBlue},${i === 0 ? '0.9' : '0.65'})`;
                if(isNumbered) {
                    // Replace dot with tiny number — keep same fixed size so rows don't shift
                    el.textContent = (i + 1) + '.';
                    el.style.background = 'transparent';
                    el.style.borderRadius = '0';
                    el.style.width = '6px';
                    el.style.height = '5px';
                    el.style.overflow = 'visible';
                    el.style.fontSize = '4.5px';
                    el.style.color = color;
                    el.style.lineHeight = '1';
                    el.style.flexShrink = '0';
                } else {
                    // Restore round dot
                    el.textContent = '';
                    el.style.fontSize = '';
                    el.style.color = '';
                    el.style.lineHeight = '';
                    el.style.overflow = '';
                    el.style.borderRadius = '50%';
                    el.style.width = i === 0 ? '3px' : '2px';
                    el.style.height = i === 0 ? '3px' : '2px';
                    el.style.background = color;
                }
            });
            tocEl.querySelectorAll('.pcr-toc-line').forEach((el, i) => {
                el.style.background = i === 0 ? `rgba(${tocBlue},0.6)` : `rgba(${tocBlue},0.42)`;
            });
            tocEl.querySelectorAll('.pcr-toc-pg').forEach(el => {
                el.style.background = `rgba(${tocBlue},0.3)`;
            });
        }

        // User avatar dots
        doc.querySelectorAll('.pcr-prev-avatar').forEach(av => {
            av.style.display = o.no_icons ? 'none' : 'block';
            av.style.background = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.22)';
        });

    }

    // Close on backdrop click or X
    document.getElementById('pdfcrowd-settings-overlay').addEventListener('click', function(e) {
        if(e.target === this) pcrCloseSettings();
    });
    document.getElementById('pdfcrowd-settings-close').addEventListener('click', pcrCloseSettings);

    // Segment buttons
    document.querySelectorAll('#pdfcrowd-settings-modal .pcr-segment').forEach(function(container) {
        container.querySelectorAll('.pcr-seg-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                container.querySelectorAll('.pcr-seg-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                if(container.id === 'pcr-margins') {
                    const customMargins = document.getElementById('pcr-margins-custom');
                    if(customMargins) customMargins.style.display = this.dataset.value === 'custom' ? 'flex' : 'none';
                }
                pcrUpdatePreview(null);
            });
        });
    });

    // Theme cards
    document.querySelectorAll('#pcr-theme .pcr-theme-card').forEach(function(card) {
        card.addEventListener('click', function() {
            document.querySelectorAll('#pcr-theme .pcr-theme-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            pcrUpdatePreview(null);
        });
    });

    // Build theme palette from PDFCROWD_THEMES
    const qPalette = document.getElementById('pcr-q-palette');
    if(qPalette) {
        Object.keys(PDFCROWD_THEMES).forEach(function(key) {
            const t = PDFCROWD_THEMES[key];
            const btn = document.createElement('button');
            btn.className = 'pcr-palette-btn';
            btn.setAttribute('data-color', key);
            btn.setAttribute('title', t.label);
            const border = key === 'none' ? '1.5px dashed #ccc' : '1.5px solid rgba(0,0,0,0.1)';
            btn.style.cssText = 'width:22px;height:22px;border-radius:50%;background:' +
                t.swatch + ';border:' + border + ';cursor:pointer;';
            qPalette.appendChild(btn);
        });
    }

    // Unified palette clicks
    if(qPalette) {
        qPalette.querySelectorAll('.pcr-palette-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                qPalette.querySelectorAll('.pcr-palette-btn').forEach(function(b) {
                    b.style.outline = 'none';
                    b.style.outlineOffset = '';
                });
                this.style.outline = '2px solid #EA4C3A';
                this.style.outlineOffset = '2px';
                const inp = document.getElementById('pcr-q-color-value');
                if(inp) inp.value = this.getAttribute('data-color');
                pcrUpdatePreview(null);
            });
        });
    }

    // Slider
    const zoomSlider = document.getElementById('pcr-zoom');
    if(zoomSlider) zoomSlider.addEventListener('input', function() {
        document.getElementById('pcr-zoom-value').textContent = this.value + '%';
        pcrUpdatePreview(null);
    });

    // Toggles
    document.querySelectorAll('#pdfcrowd-settings-modal .pcr-toggle input').forEach(function(cb) {
        cb.addEventListener('change', function() { pcrUpdatePreview(null); });
    });

    // Apply
    document.getElementById('pdfcrowd-settings-apply').addEventListener('click', function() {
        pcrCloseSettings(); // Close first — don't depend on async callback
        try {
            const newOpts = pcrGetSettings();
            pdfcrowdShared.getOptions(function(existing) {
                newOpts.no_questions = existing.no_questions;
                chrome.storage.sync.set({options: newOpts});
            });
        } catch(e) {
            console.error('pdfcrowd settings save error:', e);
        }
    });

    // Reset
    document.getElementById('pdfcrowd-settings-reset').addEventListener('click', function() {
        pcrLoadSettings(pdfcrowdShared.defaultOptions);
        pcrUpdatePreview(pdfcrowdShared.defaultOptions);
    });

    setInterval(checkForContent, 1000);
}

pdfcrowdChatGPT.showError = function(status, text, hideContact) {
  let html;
  if (status == 432) {
    html = [
      "<strong>Fair Use Notice</strong><br>",
      "Current usage is over the limit. Please wait a while before trying again.<br><br>",
    ];
  } else {
      html = [];
      if (status) {
          if(status == 'network-error') {
              html.push('Network error while connecting to the conversion service');
          } else {
              html.push(`Code: ${status}`);
          }
          html.push(text);
          html.push('Please try again later');
      } else {
          html.push(text);
      }
      if(!hideContact) {
          html.push(`If the problem persists, contact us at
            <a href="mailto:panarin2005@gmail.com?subject=Export%20ChatGPT%20error">
              panarin2005@gmail.com
            </a>`);
      }
  }
  html = html.join('<br>');
  document.getElementById('pdfcrowd-error-overlay').style.display = 'flex';
  document.getElementById('pdfcrowd-error-message').innerHTML = html;
};

pdfcrowdChatGPT.saveBlob = function(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 100);
};
