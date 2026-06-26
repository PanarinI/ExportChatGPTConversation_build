'use strict';

// In-page settings modal: schema-backed controls (segments, swatches, theme
// cards, live preview) + persistence. Uses EXPORT_THEMES, isLight, pdfcrowdShared.

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

// Wire up modal controls. Called from common.js init() AFTER the modal markup is
// injected into the page, so the event targets exist.
function wireSettings() {
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
}
