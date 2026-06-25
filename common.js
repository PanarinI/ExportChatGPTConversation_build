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
        const theme = EXPORT_THEMES[options.q_color] || EXPORT_THEMES['default'];
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
                '<a href="' + url + '" style="color:#888;text-decoration:underline">' +
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

        // ── 1. (no JS needed — +N badge hidden via CSS in custom_css) ──

        // ── 2a. Style links ──────────────────────────────────────────────────────
        // Gotenberg/Chromium renders link annotations correctly from Tailwind
        // classes without needing pointer-events fixes in JS. Just ensure links
        // themselves have visible text styling.
        clone.querySelectorAll('a[href]').forEach(function(a) {
            a.style.setProperty('color', 'inherit', 'important');
            a.style.setProperty('text-decoration', 'underline', 'important');
        });

        // ── 2b. Neutralize favicon service images (they fail to load in Gotenberg) ──
        // CRITICAL: removing an <img> that sits INSIDE an <a> collapses the link's
        // inline box, and Chromium then drops the link's PDF click-annotation —
        // this is what made every inline link non-clickable (working file had the
        // favicons present, broken file had them removed). So for favicons inside a
        // link we KEEP the element and just blank its src (kills the broken-image
        // glyph while the box — and the annotation — stays intact). Favicons that
        // are not inside a link can be removed safely.
        var BLANK_PX = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        clone.querySelectorAll('img').forEach(function(img) {
            const src = img.getAttribute('src') || '';
            if (/google\.com\/s2\/favicons|gstatic\.com\/faviconV2/.test(src)) {
                if (img.closest('a')) {
                    img.setAttribute('src', BLANK_PX);
                } else {
                    img.remove();
                }
            }
        });

        // ── 3. All UI buttons outside markdown/pre ────────────────────────
        // Removes: message action rows (copy/like/share/edit), image edit buttons.
        // Exception: buttons wrapping DALL-E images (no aria-label) — unwrap those.
        // Buttons with aria-label (e.g. "Источники") are removed entirely incl. their images.
        clone.querySelectorAll('button').forEach(function(el) {
            if(!el.closest('.markdown') && !el.closest('pre')) {
                if(el.closest('.no-scrollbar')) {
                    // Gallery image buttons — unwrap to keep the image
                    const parent = el.parentElement;
                    if(parent) {
                        while(el.firstChild) parent.insertBefore(el.firstChild, el);
                        el.remove();
                    }
                } else if(!el.getAttribute('aria-label') && el.querySelector('img')) {
                    // DALL-E images are wrapped in unlabeled buttons — unwrap instead of remove
                    const parent = el.parentElement;
                    if(parent) {
                        while(el.firstChild) parent.insertBefore(el.firstChild, el);
                        el.remove();
                    }
                } else {
                    el.remove();
                }
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

        // ── 4b. Image gallery: strip each cell down to just the img ─────────
        // ChatGPT puts a grey skeleton placeholder div before the img inside each cell.
        // Without Tailwind CSS, that placeholder renders visibly and hides the image.
        clone.querySelectorAll('.no-scrollbar > *').forEach(function(cell) {
            const img = cell.querySelector('img');
            if (img) {
                while (cell.firstChild) cell.removeChild(cell.firstChild);
                cell.appendChild(img);
                img.style.setProperty('display', 'block', 'important');
                img.style.setProperty('width', '100%', 'important');
                img.style.setProperty('height', '100%', 'important');
                img.style.setProperty('object-fit', 'cover', 'important');
                img.style.setProperty('position', 'static', 'important');
                img.style.setProperty('border-radius', '10px', 'important');
            } else {
                cell.remove();
            }
        });

        // ── 4c. Image gallery: remove aspect-ratio inline styles ─────────
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

        // ── 10. Extract DALL-E images from complex ChatGPT containers ────
        // Replace the entire ChatGPT image wrapper with a plain <img> block.
        clone.querySelectorAll('img').forEach(function(img) {
            const src = img.getAttribute('src') || '';
            if (!src.startsWith('data:image/png') || src.length < 500000) return;
            if (img.closest('.no-scrollbar')) return;

            // Build a clean standalone image block
            const figure = img.ownerDocument.createElement('div');
            figure.style.cssText = 'display:block;width:100%;margin:16px 0;text-align:center';
            const cleanImg = img.ownerDocument.createElement('img');
            cleanImg.setAttribute('src', src);
            cleanImg.style.cssText = 'display:block;max-width:100%;height:auto;margin:0 auto;border-radius:8px';
            figure.appendChild(cleanImg);

            // Walk up max 6 levels to find the outermost image-only wrapper
            let container = img;
            for (let d = 0; d < 6; d++) {
                const p = container.parentElement;
                if (!p) break;
                // Stop if parent contains text or other non-image content
                const hasText = p.childNodes && Array.from(p.childNodes).some(function(n) {
                    return n.nodeType === 3 && n.textContent.trim().length > 0;
                });
                if (hasText) break;
                if (p.classList.contains('markdown')) break;
                if (p.hasAttribute('data-message-author-role')) break;
                if (p.matches('main, article')) break;
                container = p;
            }

            // Hide the original broken container, insert clean image before it
            if (container.parentElement) {
                container.parentElement.insertBefore(figure, container);
                container.style.setProperty('display', 'none', 'important');
            }
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
                '<a href="#' + id + '" style="text-decoration:underline;' +
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

    // ─────────────────────────────────────────────────────────────────────
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
        const themeData = EXPORT_THEMES[o.q_color];
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

    // Build theme palette from EXPORT_THEMES
    const qPalette = document.getElementById('pcr-q-palette');
    if(qPalette) {
        Object.keys(EXPORT_THEMES).forEach(function(key) {
            const t = EXPORT_THEMES[key];
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
    sendGA4Event('export_completed');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 100);
};
