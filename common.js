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

    async function convert(event) {
        // Rate Us intercept: open dropdown instead of exporting
        if(pcrRateUsMode) {
            if(!pcrDropdownOpen) pcrOpenDropdown();
            return;
        }

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

        // Images inside <a> tags are citation favicons — not real content images
        const hasImages = !!(el.querySelector('canvas, video') ||
            Array.from(el.querySelectorAll('img')).some(function(img) {
                return !img.closest('a');
            }));
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
        sendGA4Event('export_selected_used');

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
                    '.no-scrollbar img{width:100% !important;height:100% !important;object-fit:cover !important;border-radius:10px !important;border:none !important}',
                    'a{color:inherit !important;text-decoration:underline !important;pointer-events:auto !important}'
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
                ('') +
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
