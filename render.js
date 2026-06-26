'use strict';

// PDF document rendering: clean the cloned conversation, code-block styling,
// TOC / header / date / model / source builders, option->Gotenberg-params mapping.
// Uses EXPORT_THEMES, helpers (isLight...), pdfcrowdShared. Params in, HTML/data out.

// Shared PDF custom CSS for BOTH the full export and the block-selection export
// (single source of truth -> no dark-theme / stripe divergence between paths).
// theme = an EXPORT_THEMES entry; isDarkMode = bool.
function buildExportCss(theme, isDarkMode) {
    return [
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
                    ] : []).join(' ');
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
