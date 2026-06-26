'use strict';

// ── GA4 Measurement Protocol ──────────────────────────────────────────────────
// fetch must go through background.js — ChatGPT CSP blocks requests from content scripts
function sendGA4Event(eventName) {
    chrome.runtime.sendMessage({ action: 'ga4Event', eventName: eventName });
}

const pdfcrowdChatGPT = {};

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
    blockStyle.textContent = UI_CSS;
    document.head.appendChild(blockStyle);

    const pdfcrowdBlockHtml = EXPORT_BUTTON_HTML;

    // Re-entrancy guard: ignore clicks while an export is already running
    // (prevents the double-click -> two half-finished files bug).
    let exportInProgress = false;

    async function convert(event) {
        // Rate Us intercept: open dropdown instead of exporting
        if(pcrRateUsMode) {
            if(!pcrDropdownOpen) pcrOpenDropdown();
            return;
        }

        if(exportInProgress) {
            return;
        }
        exportInProgress = true;

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
            exportInProgress = false;
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

            // Lock computed image sizes and convert external images to base64
            const imgPromises = [];
            main.querySelectorAll('img').forEach(function(img) {
                const isGallery = !!img.closest('.no-scrollbar');
                if (!isGallery) {
                    const rect = img.getBoundingClientRect();
                    if(rect.width > 0 && rect.height > 0) {
                        img.setAttribute('data-pdfcrowd-w', Math.round(rect.width));
                        img.setAttribute('data-pdfcrowd-h', Math.round(rect.height));
                    }
                }
                // Convert to base64 so Gotenberg can render without auth
                if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
                    let needsBackgroundFetch = /oaiusercontent\.com|images\.openai\.com/.test(img.src);
                    if (!needsBackgroundFetch && img.complete && img.naturalWidth > 0) {
                        // Same-origin or already-loaded non-auth image: use canvas
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            canvas.getContext('2d').drawImage(img, 0, 0);
                            const dataUrl = canvas.toDataURL('image/png');
                            img.setAttribute('src', dataUrl);
                        } catch(e) {
                            // CORS tainted canvas — fetch via background with auth cookies
                            needsBackgroundFetch = true;
                        }
                    } else if (!needsBackgroundFetch && (!img.complete || img.naturalWidth === 0)) {
                        // Image isn't loaded — can't use canvas, try background fetch
                        needsBackgroundFetch = true;
                    }
                    if (needsBackgroundFetch) {
                        const capturedImg = img;
                        const srcToFetch = capturedImg.getAttribute('src') || capturedImg.src;
                        imgPromises.push(new Promise(function(resolve) {
                            chrome.runtime.sendMessage({
                                action: 'fetchImageAsBase64',
                                src: srcToFetch
                            }, function(response) {
                                if (response && response.data) capturedImg.setAttribute('src', response.data);
                                resolve();
                            });
                        }));
                    }
                }
            });

            Promise.all(imgPromises).then(function() {

            const main_clone = prepareContent(main);

            // Log all images in clone to check src
            main_clone.querySelectorAll('img').forEach(function(img, i) {
                const attr = img.getAttribute('src') || '';
            });

            restoreVirtualizedTurns(main_clone, turnCache);

            // Second-pass: convert any images that came in via virtualized turns
            // (they were captured as raw HTML with original URLs, not base64)
            const lateImgPromises = [];
            main_clone.querySelectorAll('img').forEach(function(img) {
                const src = img.getAttribute('src') || '';
                if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
                const capturedImg = img;
                lateImgPromises.push(new Promise(function(resolve) {
                    chrome.runtime.sendMessage({
                        action: 'fetchImageAsBase64',
                        src: src
                    }, function(response) {
                        if (response && response.data) capturedImg.setAttribute('src', response.data);
                        resolve();
                    });
                }));
            });

            Promise.all(lateImgPromises).then(function() {

            main_clone.querySelectorAll('.no-scrollbar img').forEach(function(img, i) {
                const src = img.getAttribute('src') || '';
            });

            cleanupForPdf(main_clone);

            main_clone.querySelectorAll('.no-scrollbar img').forEach(function(img, i) {
                const src = img.getAttribute('src') || '';
            });

            applyQuestionStyles(main_clone, options);

            let title = getTitle();
            let filename = title;

            const cleanup = restoreButtonState;

            function doConvert() {
                // Resolve theme and dark mode before building data object
                const theme = EXPORT_THEMES[options.q_color] || EXPORT_THEMES['default'];
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
                        '.no-scrollbar img{width:100% !important;height:100% !important;object-fit:cover !important;border-radius:10px !important;border:none !important;display:block !important}',
                        // ── DALL-E image containers — remove aspect-ratio, ensure visible ──
                        '[style*="aspect-ratio"]{aspect-ratio:unset !important;height:auto !important}',
                        'img[src^="data:"]{display:block !important;max-width:100% !important;height:auto !important;visibility:visible !important;opacity:1 !important}',
                        // ── Links — inherit text color, underline, ensure clickable ──
                        'a{color:inherit !important;text-decoration:underline !important;pointer-events:auto !important}',
                        // ── Favicon/citation images inside links — limit size ──
                        'a img:not([src^="data:"]){max-width:20px !important;max-height:20px !important;width:auto !important;height:auto !important;display:inline !important;vertical-align:middle !important}'
                    ].concat(isDarkMode ? [
                        // ── Dark mode overrides ───────────────────────────
                        'body,html{background:#212121 !important;color:#e8e8e8 !important;border:none !important;margin:0 !important;padding:0 !important}',
                        '*{box-sizing:border-box}',
                        'body>div,body>main{background:#212121 !important;border:none !important}',
                        'hr{border-top-color:#444 !important}',
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
            }); // closes lateImgPromises Promise.all
            }); // closes imgPromises Promise.all
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
            function pcrTriggerWelcomeRipple() {
                const wrap = pdfcrowd_block;
                if(!wrap) return;
                const rings = [1, 2, 3].map(function() {
                    const r = document.createElement('div');
                    r.className = 'pdfcrowd-ring';
                    wrap.appendChild(r);
                    return r;
                });
                setTimeout(function() {
                    rings.forEach(function(r) { r.remove(); });
                }, 6000);
            }

            // New tab: flag was set in storage before tab was created, read it on load
            chrome.storage.local.get('pdfcrowdHighlightBtn', function(result) {
                if(!result.pdfcrowdHighlightBtn) return;
                chrome.storage.local.remove('pdfcrowdHighlightBtn');
                pcrTriggerWelcomeRipple();
            });

            // Existing tab: background.js sends this message instead of reloading
            chrome.runtime.onMessage.addListener(function(message) {
                if(message.action === 'pcrHighlightBtn') {
                    pcrTriggerWelcomeRipple();
                }
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

setupBlockMode();

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

    wireSettings();

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
    sendGA4Event('export_completed');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 100);
};
