'use strict';

// 'Select to export' block-selection mode: pick conversation blocks and export
// only those. Self-contained (own state + DOM refs); uses global capture/render/
// helpers + the request transport. init() calls setupBlockMode() after markup.

// Rebuild the user's selected turns in the export clone from their snapshots.
// A turn is snapshotted (bids and all) the moment a block in it is toggled, so
// the SNAPSHOT — not the live DOM — is the authority on what the user picked.
// Since 2026-07 ChatGPT's virtualizer UNMOUNTS turns the user scrolled away
// from: they are gone from the clone, not just emptied. So a snapshot must be
// INSERTED, not only used to fill an empty placeholder — the old fill-only
// behaviour silently dropped every selection outside the mounted window. This
// is block-mode's analog of restoreVirtualizedTurns() (capture.js). Cases:
//   • turn missing from clone          → insert snapshot in numeric-testid order
//   • turn present but empty            → replace (old placeholder mode)
//   • turn mounted, keeps its kept bid  → keep live clone (it has base64 images)
//   • turn mounted, kept bid gone       → replace (remount: snapshot is truth)
function restoreSelectedTurns(clone, turnSnapshots, bidsToKeep) {
    if(!turnSnapshots || turnSnapshots.size === 0) return;
    const liveTurns = clone.querySelectorAll(
        '[data-testid^="conversation-turn"]');
    const container = liveTurns.length ? liveTurns[0].parentElement : null;
    // Trailing number of data-testid="conversation-turn-N". The number runs
    // across the whole conversation, so sorting by it rebuilds order under the
    // ragged mounted window (kept local so block-mode stays self-contained).
    const idxOf = function(id) {
        const m = /(\d+)\s*$/.exec(id || '');
        return m ? parseInt(m[1], 10) : -1;
    };
    const liveHasKeptBid = function(turn) {
        if(!turn) return false;
        return Array.from(turn.querySelectorAll('[data-gptpdf-bid]')).some(
            function(el) {
                return bidsToKeep.has(el.getAttribute('data-gptpdf-bid'));
            });
    };
    turnSnapshots.forEach(function(html, turnId) {
        const existing = clone.querySelector(
            '[data-testid="' + turnId + '"]');
        // Mounted turn that still carries a kept bid → keep the live clone,
        // whose images are already base64. Otherwise the snapshot wins.
        if(liveHasKeptBid(existing)) return;
        const box = document.createElement('div');
        box.innerHTML = html;
        const snap = box.firstElementChild;
        if(!snap) return;
        if(existing) { existing.replaceWith(snap); return; }
        if(!container) return; // no anchor to insert into (no mounted turns)
        const idx = idxOf(turnId);
        const sibs = container.querySelectorAll(
            '[data-testid^="conversation-turn"]');
        let placed = false;
        for(let i = 0; i < sibs.length; i++) {
            if(idxOf(sibs[i].getAttribute('data-testid')) > idx) {
                container.insertBefore(snap, sibs[i]);
                placed = true;
                break;
            }
        }
        if(!placed) container.appendChild(snap);
    });
}

function setupBlockMode() {
    const blocksBtn = document.getElementById('gptpdf-blocks');
    const bar       = document.getElementById('gptpdf-blocks-bar');
    const countEl   = document.getElementById('gptpdf-blocks-count');
    const exportBtn = document.getElementById('gptpdf-blocks-export');
    const cancelBtn = document.getElementById('gptpdf-blocks-cancel');
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
            if(markdown) {
                Array.from(markdown.children).forEach(function(child) {
                    const tag = child.tagName;
                    if(!tag) return;
                    if(tag === 'HR' || tag === 'SCRIPT' || tag === 'STYLE') return;
                    // Skip our own injected UI elements
                    if(child.classList.contains('gptpdf-img-sel-row')) return;
                    if(child.hasAttribute('data-gptpdf-bid')) return;
                    result.push(child);
                });
            }
            // Generated/uploaded images (e.g. DALL-E) often live OUTSIDE .markdown
            // in their own container — make them selectable blocks too.
            turn.querySelectorAll('img').forEach(function(img) {
                const src = img.getAttribute('src') || '';
                // Recognise a generated/uploaded image 3 ways, so detection is
                // robust to the src changing. The export converts the live <img>
                // to a base64 src, so a URL-only check would STOP matching it after
                // the first export — and the checkbox would vanish (the reported bug).
                const isGenImg = !!img.closest('[class*="imagegen"]');
                const isProtectedUrl = src.indexOf('/backend-api/') !== -1 ||
                                       src.indexOf('oaiusercontent') !== -1 ||
                                       src.indexOf('images.openai') !== -1;
                const isBigData = src.startsWith('data:image/') && src.length > 50000;
                if(!isGenImg && !isProtectedUrl && !isBigData) return;
                if(markdown && markdown.contains(img)) return;
                let container = img;
                while(container.parentElement && container.parentElement !== turn) {
                    container = container.parentElement;
                }
                if(container !== turn && container.tagName &&
                   !container.classList.contains('gptpdf-img-sel-row') &&
                   !container.hasAttribute('data-gptpdf-bid') &&
                   result.indexOf(container) === -1) {
                    result.push(container);
                }
            });
        });
        return result;
    }

    const isRuLang = false; // UI is English-only

    function attachBlock(el) {
        const bid = String(++bidCounter);
        el.setAttribute('data-gptpdf-bid', bid);

        // For table containers: outer div is 100% wide but the inner
        // tableWrapper is content-width. Apply visual highlight to inner only
        // so the outline/background don't span the full page width.
        let visualEl = el;
        if(el.querySelector) {
            const tableInner = el.querySelector(
                ':scope > .TyagGW_tableWrapper, :scope > [class*="tableWrapper"]');
            if(tableInner) visualEl = tableInner;
        }
        visualEl.classList.add('gptpdf-block-sel');

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
            selRow.className = 'gptpdf-img-sel-row';
            selRow.setAttribute('data-gptpdf-sel-row', bid);
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
            cbWrap.className = 'gptpdf-block-cb';
            cb = document.createElement('input');
            cb.type = 'checkbox';
            cbWrap.appendChild(cb);
            visualEl.appendChild(cbWrap);

        } else {
            cb = selRow.querySelector('input[type=checkbox]');
        }

        function toggle(checked) {
            cb.checked = checked;
            visualEl.classList.toggle('gptpdf-block-checked', checked);
            if(selRow) selRow.classList.toggle('gptpdf-img-sel-checked', checked);
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
            el.removeAttribute('data-gptpdf-bid');
            visualEl.classList.remove('gptpdf-block-sel', 'gptpdf-block-checked');
            const cbWrap = visualEl.querySelector('.gptpdf-block-cb');
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
            if(!el.hasAttribute('data-gptpdf-bid')) attachBlock(el);
        });
        updateBar();
    }

    const mainBtn    = document.getElementById('gptpdf-convert-main');
    const exitSelBtn = document.getElementById('gptpdf-exit-select');

    // Update the Export button label in selection mode
    function updateMainBtnLabel() {
        const btnLabel = mainBtn && mainBtn.querySelector('.gptpdf-lg');
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

        document.getElementById('gptpdf-extra-btns')
            .classList.add('gptpdf-hidden');

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
        bar.classList.remove('gptpdf-active');
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

        // In-button spinner (unified with the full export — no separate modal)
        startExportSpinner();

        // Hide UI but keep data-gptpdf-bid attrs alive for the clone step
        bar.classList.remove('gptpdf-active');
        document.querySelectorAll('.gptpdf-block-cb').forEach(
            function(w) { w.style.display = 'none'; });
        document.querySelectorAll('.gptpdf-block-sel').forEach(function(el) {
            el.classList.remove('gptpdf-block-sel', 'gptpdf-block-checked');
        });

        gptpdfShared.getOptions(function(options) {
            let main = document.getElementsByTagName('main');
            main = main.length ? main[0] : document.querySelector('div.grow');

            // Convert images to base64 (canvas; with a background-fetch fallback for
            // CORS-tainted / auth-protected images like DALL-E) so Gotenberg renders them
            // — same as the full export path; otherwise they show only their alt text.
            const imgPromises = [];
            main.querySelectorAll('img').forEach(function(img) {
                if(!img.closest('.no-scrollbar')) {
                    const rect = img.getBoundingClientRect();
                    if(rect.width > 0 && rect.height > 0) {
                        img.setAttribute('data-gptpdf-w', Math.round(rect.width));
                        img.setAttribute('data-gptpdf-h', Math.round(rect.height));
                    }
                }
                if(img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
                    let needsBg = /oaiusercontent\.com|images\.openai\.com/.test(img.src);
                    if(!needsBg && img.complete && img.naturalWidth > 0) {
                        try {
                            const cv = document.createElement('canvas');
                            cv.width = img.naturalWidth;
                            cv.height = img.naturalHeight;
                            cv.getContext('2d').drawImage(img, 0, 0);
                            img.setAttribute('src', cv.toDataURL('image/png'));
                        } catch(e) { needsBg = true; }
                    } else if(!needsBg && (!img.complete || img.naturalWidth === 0)) {
                        needsBg = true;
                    }
                    if(needsBg) {
                        const cap = img;
                        const srcToFetch = cap.getAttribute('src') || cap.src;
                        imgPromises.push(new Promise(function(resolve) {
                            chrome.runtime.sendMessage(
                                { action: 'fetchImageAsBase64', src: srcToFetch },
                                function(response) {
                                    if(response && response.data) cap.setAttribute('src', response.data);
                                    resolve();
                                });
                        }));
                    }
                }
            });

            Promise.all(imgPromises).then(function() {

            const main_clone = prepareContent(main);
            // Rebuild the selected turns from their snapshots. Harvest already
            // ran on block-mode entry, but its cache is discarded — the snapshots
            // (taken at click time, WITH the bids) are block-mode's source of
            // truth. Under the current virtualizer a turn the user scrolled away
            // from is unmounted (gone from the clone), so snapshots are INSERTED,
            // not just used to fill empty placeholders; otherwise every selection
            // outside the mounted window is silently dropped. Mounted turns that
            // still carry their kept bid keep their live clone (base64 images).
            restoreSelectedTurns(main_clone, turnSnapshots, bidsToKeep);
            // Snapshots are captured with the selection-highlight classes still
            // on the block; strip them so they don't linger on inserted turns
            // (live-clone turns were already cleaned before cloning).
            main_clone.querySelectorAll('.gptpdf-block-sel, .gptpdf-block-checked')
                .forEach(function(el) {
                    el.classList.remove(
                        'gptpdf-block-sel', 'gptpdf-block-checked');
                });

            // Remove checkbox/selection UI that got cloned
            main_clone.querySelectorAll('.gptpdf-block-cb').forEach(
                function(w) { w.remove(); });
            main_clone.querySelectorAll('.gptpdf-img-sel-row').forEach(
                function(w) { w.remove(); });

            // Bug #1 fix: mark turns that have at least one selected block
            // BEFORE removing anything (so we can sweep correctly afterward)
            const turnsWithSelection = new Set();
            main_clone.querySelectorAll('[data-gptpdf-bid]').forEach(
                function(el) {
                    if(bidsToKeep.has(el.getAttribute('data-gptpdf-bid'))) {
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

            // Stripes fix: within each kept turn, drop everything in the message
            // body that isn't a selected block (or part of one). A turn is kept
            // whole if it has ANY selection, and the bid-sweep below only removes
            // elements that carry a bid — so un-bidded leftovers (e.g. <hr>
            // separators, or the frame of an unselected table/list whose own
            // children were bidded) used to survive and render as a stack of
            // empty horizontal lines where the unselected content used to be.
            const keptBlocks = [];
            main_clone.querySelectorAll('[data-gptpdf-bid]').forEach(
                function(el) {
                    if(bidsToKeep.has(el.getAttribute('data-gptpdf-bid'))) {
                        keptBlocks.push(el);
                    }
                }
            );
            turnsWithSelection.forEach(function(turn) {
                const md = turn.querySelector('.markdown');
                if(!md) return;
                Array.from(md.children).forEach(function(child) {
                    const kept = keptBlocks.some(function(k) {
                        return k === child || child.contains(k) || k.contains(child);
                    });
                    if(!kept) child.remove();
                });
            });

            // Remove non-selected blocks
            main_clone.querySelectorAll('[data-gptpdf-bid]').forEach(
                function(el) {
                    const bid = el.getAttribute('data-gptpdf-bid');
                    el.removeAttribute('data-gptpdf-bid');
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

            // Extract DALL-E images (same step as the full-export cleanup) so the
            // absolute image box becomes a clean, visible <img> block in the PDF.
            extractDalleImages(main_clone);

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

            gptpdfChatGPT.doRequest(
                htmlContent, data, addPdfExtension(title), function() {
                    stopExportSpinner();
                }
            );
            }); // close the image-conversion Promise.all().then
        });
    });
}
