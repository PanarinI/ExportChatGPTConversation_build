'use strict';

// ── GA4 Measurement Protocol ──────────────────────────────────────────────────
// fetch must go through background.js — ChatGPT CSP blocks requests from content scripts
function sendGA4Event(eventName) {
    chrome.runtime.sendMessage({ action: 'ga4Event', eventName: eventName });
}

// Shared in-button export feedback (dots spinner + 8s seconds counter), used by
// BOTH the full export and the block-selection export — one UI, no extra modal.
let _exportSecs = 0, _exportTick = null, _exportCountStart = null;
function startExportSpinner() {
    const btn = document.getElementById('gptpdf-convert-main');
    if(btn) btn.disabled = true;
    const spinner = document.getElementById('gptpdf-spinner');
    if(spinner) spinner.classList.remove('gptpdf-hidden');
    const btnElems = document.getElementsByClassName('gptpdf-btn-content');
    for(let i = 0; i < btnElems.length; i++) btnElems[i].classList.add('gptpdf-invisible');
    _exportCountStart = setTimeout(function() {
        if(!spinner) return;
        const dots = spinner.querySelector('.gptpdf-dots-loader');
        if(dots) dots.style.display = 'none';
        let counter = spinner.querySelector('.gptpdf-export-counter');
        if(!counter) {
            counter = document.createElement('div');
            counter.className = 'gptpdf-export-counter';
            counter.style.cssText = 'color:#EA4C3A;font-weight:600;font-size:14px;text-align:center';
            (dots ? dots.parentNode : spinner).appendChild(counter);
        }
        _exportSecs = 8;
        counter.textContent = _exportSecs + 's';
        counter.style.display = '';
        _exportTick = setInterval(function() {
            _exportSecs++;
            counter.textContent = _exportSecs + 's';
        }, 1000);
    }, 8000);
}
function stopExportSpinner() {
    clearTimeout(_exportCountStart);
    if(_exportTick) { clearInterval(_exportTick); _exportTick = null; }
    const spinner = document.getElementById('gptpdf-spinner');
    if(spinner) {
        const dots = spinner.querySelector('.gptpdf-dots-loader');
        if(dots) dots.style.display = '';
        const counter = spinner.querySelector('.gptpdf-export-counter');
        if(counter) counter.style.display = 'none';
        spinner.classList.add('gptpdf-hidden');
    }
    const btn = document.getElementById('gptpdf-convert-main');
    if(btn) btn.disabled = false;
    const btnElems = document.getElementsByClassName('gptpdf-btn-content');
    for(let i = 0; i < btnElems.length; i++) btnElems[i].classList.remove('gptpdf-invisible');
}

const gptpdfChatGPT = {};

gptpdfChatGPT.init = function() {
    if(document.querySelectorAll('.gptpdf-convert').length > 0) {
        // avoid double init
        return;
    }

    const blockStyle = document.createElement('style');
    blockStyle.textContent = UI_CSS;
    document.head.appendChild(blockStyle);

    const gptpdfBlockHtml = EXPORT_BUTTON_HTML;

    // Re-entrancy guard: ignore clicks while an export is already running
    // (prevents the double-click -> two half-finished files bug).
    let exportInProgress = false;

    async function convert(event) {
        // Rate Us intercept: open dropdown instead of exporting
        if(gptpdfRateUsMode) {
            if(!gptpdfDropdownOpen) gptpdfOpenDropdown();
            return;
        }

        if(exportInProgress) {
            return;
        }
        exportInProgress = true;

        document.getElementById('gptpdf-extra-btns').classList.add(
            'gptpdf-hidden');

        startExportSpinner();

        function restoreButtonState() {
            exportInProgress = false;
            stopExportSpinner();
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

        gptpdfShared.getOptions(function(options) {
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
                        img.setAttribute('data-gptpdf-w', Math.round(rect.width));
                        img.setAttribute('data-gptpdf-h', Math.round(rect.height));
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
                    custom_css: buildExportCss(theme, isDarkMode)
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

                gptpdfChatGPT.doRequest(
                    htmlContent,
                    data,
                    addPdfExtension(filename),
                    cleanup
                );
            }

            if(options.title_mode === 'ask') {
                const dlgTitle = document.getElementById(
                    'gptpdf-title-overlay');
                const titleInput = document.getElementById('gptpdf-title');
                titleInput.value = title;
                dlgTitle.style.display = 'flex';
                titleInput.focus();
                document.getElementById('gptpdf-title-convert')
                    .onclick = function() {
                        dlgTitle.style.display = 'none';
                        title = titleInput.value.trim();
                        if(title) {
                            filename = title;
                        }
                        doConvert();
                    };
                const titleCancelBtns = dlgTitle.querySelectorAll(
                    '.gptpdf-close-btn');
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
        container.innerHTML = gptpdfBlockHtml;
        container.classList.add(
            'gptpdf-block', 'gptpdf-text-right', 'gptpdf-hidden');
        document.body.appendChild(container);

        let buttons = document.querySelectorAll('.gptpdf-convert');
        buttons.forEach(element => {
            element.addEventListener('click', convert);
        });

        document.getElementById('gptpdf-cancel-loading')
            .addEventListener('click', requestHarvestCancel);

        // ── Star rating widget ────────────────────────────────────────────
        const starsEl = document.getElementById('gptpdf-stars');
        if(starsEl) {
            const stars = starsEl.querySelectorAll('.gptpdf-star');
            stars.forEach(function(s) {
                s.addEventListener('click', function() {
                    const n = parseInt(s.dataset.n);
                    const url = n >= 4
                        ? (gptpdfShared.rateUsLink || '#')
                        : (gptpdfShared.feedbackFormLink || gptpdfShared.rateUsLink || '#');
                    window.open(url, '_blank');
                });
            });
        }

        document.getElementById('gptpdf-more').addEventListener('click', event => {
            event.stopPropagation();
            const moreButtons = document.getElementById(
                'gptpdf-extra-btns');
            if(moreButtons.classList.contains('gptpdf-hidden')) {
                moreButtons.classList.remove('gptpdf-hidden');
            } else {
                moreButtons.classList.add('gptpdf-hidden');
            }
        });

        document.addEventListener('click', event => {
            const moreButtons = document.getElementById('gptpdf-extra-btns');

            if (!moreButtons.contains(event.target)) {
                moreButtons.classList.add('gptpdf-hidden');
            }
        });

        buttons = document.querySelectorAll('.gptpdf-close-btn');
        buttons.forEach(element => {
            element.addEventListener('click', () => {
                element.closest('.gptpdf-overlay').style.display = 'none';
            });
        });

        return container;
    }

    const gptpdf_block = addPdfcrowdBlock();

    // ── Rate Us dropdown ──────────────────────────────────────────────────
    function gptpdfShowRateUs() {
        gptpdfRateUsMode = true;
        document.getElementById('gptpdf-btn-left').style.display = 'none';
        document.getElementById('gptpdf-more').style.display = 'none';
        document.getElementById('gptpdf-rateus-face').style.display = 'flex';
    }

    function gptpdfRevertToExport() {
        gptpdfRateUsMode = false;
        gptpdfDropdownOpen = false;
        document.getElementById('gptpdf-btn-left').style.display = '';
        document.getElementById('gptpdf-more').style.display = '';
        document.getElementById('gptpdf-rateus-face').style.display = 'none';
        document.getElementById('gptpdf-rateus-dropdown').style.display = 'none';
    }

    function gptpdfOpenDropdown() {
        gptpdfDropdownOpen = true;
        document.getElementById('gptpdf-rateus-dropdown').style.display = 'flex';
    }

    function gptpdfCloseDropdown() {
        gptpdfDropdownOpen = false;
        document.getElementById('gptpdf-rateus-dropdown').style.display = 'none';
        // revert button to Export immediately (per spec: outside click → back to Export)
        gptpdfRevertToExport();
    }

    // Hook into saveBlob — fires on every successful export
    const _gptpdfOrigSaveBlob = gptpdfChatGPT.saveBlob;
    gptpdfChatGPT.saveBlob = function(url, filename) {
        _gptpdfOrigSaveBlob.call(this, url, filename);
        // Rate Us appears from the 2nd successful export onward (not the 1st),
        // and only until the user has rated. Count exports in storage.
        // Also honor the legacy 'pcr_rated' key — users who rated on a pre-rename
        // build keep it in storage (survives CWS auto-update) and must NOT be re-asked.
        chrome.storage.local.get(['gptpdf_rated', 'gptpdf_export_count', 'pcr_rated'], function(r) {
            if(r.gptpdf_rated || r.pcr_rated) return;
            const count = (r.gptpdf_export_count || 0) + 1;
            chrome.storage.local.set({ gptpdf_export_count: count });
            if(count >= 2) gptpdfShowRateUs();
        });
    };

    // Star click → open URL, mark rated, revert to Export
    document.querySelectorAll('#gptpdf-dropdown-stars .gptpdf-star').forEach(function(s) {
        s.addEventListener('click', function(e) {
            e.stopPropagation();
            const n = parseInt(s.dataset.n);
            const url = n >= 4
                ? (gptpdfShared.rateUsLink || '#')
                : (gptpdfShared.feedbackFormLink || gptpdfShared.rateUsLink || '#');
            chrome.storage.local.set({ gptpdf_rated: true });
            gptpdfRevertToExport();
            window.open(url, '_blank');
        });
    });

    // Click outside → close dropdown and revert to Export
    document.addEventListener('click', function(e) {
        if(!gptpdfDropdownOpen) return;
        const btn  = document.getElementById('gptpdf-convert-main');
        const drop = document.getElementById('gptpdf-rateus-dropdown');
        if(btn && !btn.contains(e.target) && drop && !drop.contains(e.target)) {
            gptpdfCloseDropdown();
        }
    });

    // Esc → close dropdown and revert to Export
    document.addEventListener('keydown', function(e) {
        if(e.key === 'Escape' && (gptpdfRateUsMode || gptpdfDropdownOpen)) {
            gptpdfCloseDropdown();
        }
    });
    // ─────────────────────────────────────────────────────────────────────

    const BUTTON_MARGIN = -2;
    const WIDTHS = [{
        width: 135,
        cls: null
    }, {
        width: 85,
        cls: 'gptpdf-btn-smaller'
    }, {
        width: 58,
        cls: 'gptpdf-btn-smallest'
    }, {
        width: 30,
        cls: 'gptpdf-btn-xs-small'
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

                        if(rightPos !== gptpdf_block.style.right ||
                           prevClass !== newClass) {
                            gptpdf_block.style.right = rightPos;
                            gptpdf_block.style.top = '10px';
                            prevClass = newClass;
                            gptpdf_block.classList.remove(
                                'gptpdf-btn-smaller',
                                'gptpdf-btn-smallest',
                                'gptpdf-btn-xs-small');
                            if(newClass) {
                                gptpdf_block.classList.add(newClass);
                            }
                        }
                        return;
                    }
                }
            }
        }

        // Fallback position
        gptpdf_block.style.right = '18px';
        gptpdf_block.style.top = '44px';
        gptpdf_block.classList.remove(
            'gptpdf-btn-smaller',
            'gptpdf-btn-smallest',
            'gptpdf-btn-xs-small');
        gptpdf_block.classList.add('gptpdf-btn-smaller');
        prevClass = 'gptpdf-btn-smaller';
    }

    function checkForContent() {
        const validUrl = !window.location.href.startsWith(
            'https://chatgpt.com/gpts/editor');
        const hasMessages = !!document.querySelector(
            '[data-message-author-role="user"]');
        const mainBtn = document.getElementById('gptpdf-convert-main');

        if(validUrl && hasMessages) {
            // ── Normal conversation: full button ──────────────────────────
            changeButtonPosition();
            gptpdf_block.classList.remove('gptpdf-hidden');

            if(mainBtn) {
                mainBtn.classList.remove('gptpdf-no-chat');
                mainBtn.disabled = false;
            }

            // fix conflict with other extensions which remove the button
            if(!gptpdf_block.isConnected) {
                console.warn('Extension conflict, another extension deleted PDFCrowd HTML, disable other extensions to fix it.\ncreating the Save as PDF button...');
                document.body.appendChild(gptpdf_block);
            }
            if(!blockStyle.isConnected) {
                console.warn('Extension conflict, another extension deleted PDFCrowd HTML, disable other extensions to fix it.\ncreating the button style...');
                document.head.appendChild(blockStyle);
            }

            // ── Welcome ripple: show rings once after install ──────────────
            function gptpdfTriggerWelcomeRipple() {
                const wrap = gptpdf_block;
                if(!wrap) return;
                const rings = [1, 2, 3].map(function() {
                    const r = document.createElement('div');
                    r.className = 'gptpdf-ring';
                    wrap.appendChild(r);
                    return r;
                });
                setTimeout(function() {
                    rings.forEach(function(r) { r.remove(); });
                }, 6000);
            }

            // New tab: flag was set in storage before tab was created, read it on load
            chrome.storage.local.get('gptpdfHighlightBtn', function(result) {
                if(!result.gptpdfHighlightBtn) return;
                chrome.storage.local.remove('gptpdfHighlightBtn');
                gptpdfTriggerWelcomeRipple();
            });

            // Existing tab: background.js sends this message instead of reloading
            chrome.runtime.onMessage.addListener(function(message) {
                if(message.action === 'gptpdfHighlightBtn') {
                    gptpdfTriggerWelcomeRipple();
                }
            });

        } else if(validUrl) {
            // ── Home page / no messages: dimmed button with tooltip ────────
            changeButtonPosition();
            gptpdf_block.classList.remove('gptpdf-hidden');

            if(mainBtn) {
                mainBtn.classList.add('gptpdf-no-chat');
                mainBtn.disabled = false; // keep clickable for the tooltip
            }

            if(!gptpdf_block.isConnected) {
                document.body.appendChild(gptpdf_block);
            }
            if(!blockStyle.isConnected) {
                document.head.appendChild(blockStyle);
            }

        } else {
            gptpdf_block.classList.add('gptpdf-hidden');
        }
    }

    // ── Tooltip click handler for home-page (no-chat) state ──────────────────
    (function() {
        const mainBtn = document.getElementById('gptpdf-convert-main');
        const tooltip = document.getElementById('gptpdf-no-chat-tooltip');
        if(!mainBtn || !tooltip) return;

        mainBtn.addEventListener('click', function(e) {
            if(!mainBtn.classList.contains('gptpdf-no-chat')) return;
            e.stopPropagation();
            tooltip.classList.add('gptpdf-tooltip-visible');
            clearTimeout(mainBtn._tooltipTimer);
            mainBtn._tooltipTimer = setTimeout(function() {
                tooltip.classList.remove('gptpdf-tooltip-visible');
            }, 3000);
        }, true); // capture so it fires before the normal convert handler
    })();

// ── Block-selection mode ──────────────────────────────────────────────────────

setupBlockMode();

const singlePageBtn = document.getElementById('gptpdf-single-page');

if (singlePageBtn) {
    gptpdfShared.getOptions(function(options) {
        if(options.single_page) {
            singlePageBtn.classList.add('gptpdf-active');
        }
    });

    singlePageBtn.addEventListener('click', function() {
        gptpdfShared.getOptions(function(options) {
            options.single_page = !options.single_page;
            chrome.storage.sync.set({options: options});
            if(options.single_page) {
                singlePageBtn.classList.add('gptpdf-active');
            } else {
                singlePageBtn.classList.remove('gptpdf-active');
            }
        });
    });
}

const aiOnlyBtn = document.getElementById('gptpdf-ai-only');

if (aiOnlyBtn) {
    gptpdfShared.getOptions(function(options) {
        if(options.no_questions) {
            aiOnlyBtn.classList.add('gptpdf-active');
        }
    });

    aiOnlyBtn.addEventListener('click', function() {
        gptpdfShared.getOptions(function(options) {

            options.no_questions = !options.no_questions;

            chrome.storage.sync.set({options: options});

            if(options.no_questions) {
                aiOnlyBtn.classList.add('gptpdf-active');
            } else {
                aiOnlyBtn.classList.remove('gptpdf-active');
            }
        });
    });
}
    const options_el = document.getElementById('gptpdf-options');
    if(gptpdfShared.hasOptions) {
        options_el.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('gptpdf-extra-btns').classList.add('gptpdf-hidden');
            gptpdfOpenSettings();
        });
    } else {
        options_el.remove();
    }

    wireSettings();

    setInterval(checkForContent, 1000);
}

gptpdfChatGPT.showError = function(status, text, hideContact) {
  const html = [];
  // Gotenberg returns 503 with a raw "--api-timeout" message when rendering takes
  // too long — translate that into something a normal user can act on.
  const isTimeout = status == 503 || (text && /time limit|timeout|--api-timeout/i.test(text));
  if (status == 432) {
      html.push('<strong>Fair Use Notice</strong>');
      html.push('Current usage is over the limit. Please wait a while before trying again.');
  } else if (isTimeout) {
      html.push('<strong>This conversation is too large to render in time.</strong>');
      html.push('Try exporting fewer messages (use the "Select to export" option) or a shorter chat.');
  } else if (status == 'network-error') {
      html.push('Network error while connecting to the conversion service.');
      html.push('Please check your connection and try again.');
  } else {
      if (status) html.push('Something went wrong (code ' + status + ').');
      if (text) html.push(text);
      html.push('Please try again later.');
  }
  if (!hideContact && status != 432 && !isTimeout) {
      html.push('If the problem persists, contact us at ' +
          '<a href="mailto:panarin2005@gmail.com?subject=Export%20ChatGPT%20error">panarin2005@gmail.com</a>');
  }
  document.getElementById('gptpdf-error-message').innerHTML = html.join('<br>');
  document.getElementById('gptpdf-error-overlay').style.display = 'flex';
};

gptpdfChatGPT.saveBlob = function(url, filename) {
    sendGA4Event('export_completed');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 100);
};
