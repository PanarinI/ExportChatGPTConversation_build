'use strict';

// 'Select to export' block-selection mode: pick conversation blocks and export
// only those. Self-contained (own state + DOM refs); uses global capture/render/
// helpers + the request transport. init() calls setupBlockMode() after markup.

function setupBlockMode() {
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
    const turnSnapshots = new Map(); // data-testid -> message outerHTML; keeps selection alive across unmount

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
                '<span style="font-size:13px;color:#EA4C3A;font-weight:500;' +
                'user-select:none;pointer-events:none">' +
                (isRuLang ? 'Выбрать изображение' : 'Select image block') +
                '</span>' +
                '<input type="checkbox" style="width:16px;height:16px;' +
                'accent-color:#EA4C3A;cursor:pointer;flex-shrink:0;margin-left:auto">';
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
            // Snapshot the whole message NOW (while mounted) so the selection
            // survives ChatGPT unmounting it on scroll; restored at export time.
            const _turn = el.closest('[data-testid^="conversation-turn"]');
            if(_turn) turnSnapshots.set(_turn.getAttribute('data-testid'), _turn.outerHTML);
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
        turnSnapshots.clear();
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
        turnSnapshots.clear();
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
            // Restore every selected message from its snapshot (incl. ones that
            // scrolled out and unmounted) so their selection marks are present.
            turnSnapshots.forEach(function(html, turnId) {
                const t = main_clone.querySelector('[data-testid="' + turnId + '"]');
                if(t) t.outerHTML = html;
            });

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
            const theme = EXPORT_THEMES[options.q_color] || EXPORT_THEMES['default'];

            const title    = getTitle();
            const data = {
                jpeg_quality: 70,
                image_dpi: 150,
                convert_images_to_jpeg: 'all',
                title: title,
                rendering_mode: 'viewport',
                smart_scaling_mode: 'viewport-fit',
                viewport_width: 1300,
                custom_css: buildExportCss(theme, isDark)
            };
            applyMarginSettings(data, options);

            const classes = buildCssClasses(options, false);
            if(isDark) data.page_background_color = '212121';
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
}
