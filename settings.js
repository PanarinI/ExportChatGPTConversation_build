'use strict';

// In-page settings modal: schema-backed controls (segments, swatches, theme
// cards, live preview) + persistence. Uses EXPORT_THEMES, isLight, gptpdfShared.

// ===== Settings Modal Logic =====
function gptpdfOpenSettings() {
    const overlay = document.getElementById('gptpdf-settings-overlay');
    overlay.style.display = 'flex';
    gptpdfShared.getOptions(function(opts) {
        gptpdfLoadSettings(opts);
        gptpdfUpdatePreview(opts);
    });
}

function gptpdfCloseSettings() {
    document.getElementById('gptpdf-settings-overlay').style.display = 'none';
}

function gptpdfSetSegment(id, value) {
    const el = document.getElementById(id);
    if(!el) return;
    el.querySelectorAll('.gptpdf-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === value));
}

function gptpdfGetSegment(id) {
    const el = document.getElementById(id);
    if(!el) return '';
    const a = el.querySelector('.gptpdf-seg-btn.active');
    return a ? a.dataset.value : '';
}

function gptpdfSetSwatch(id, value) {
    const el = document.getElementById(id);
    if(!el) return;
    el.querySelectorAll('.gptpdf-swatch').forEach(b => b.classList.toggle('active', b.dataset.value === value));
}

function gptpdfGetSwatch(id) {
    const el = document.getElementById(id);
    if(!el) return 'default';
    const a = el.querySelector('.gptpdf-swatch.active');
    return a ? a.dataset.value : 'default';
}

// Expand 3-digit hex (#rgb) to 6-digit (#rrggbb) required by <input type="color">
function gptpdfNormalizeColor(color, fallback) {
    if(!color) return fallback || '#000000';
    return color.replace(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/, '#$1$1$2$2$3$3');
}

function gptpdfSetTheme(value) {
    const el = document.getElementById('gptpdf-theme');
    if(!el) return;
    el.querySelectorAll('.gptpdf-theme-card').forEach(c => c.classList.toggle('active', c.dataset.value === value));
}

function gptpdfGetTheme() {
    const el = document.getElementById('gptpdf-theme');
    if(!el) return '';
    const a = el.querySelector('.gptpdf-theme-card.active');
    return a ? a.dataset.value : '';
}

function gptpdfLoadSettings(opts) {
    gptpdfSetSegment('gptpdf-page-size', opts.page_size || 'a4');
    gptpdfSetSegment('gptpdf-orientation', opts.orientation || '');
    gptpdfSetTheme(opts.theme !== undefined ? opts.theme : '');
    const zoom = opts.zoom || 100;
    document.getElementById('gptpdf-zoom').value = zoom;
    document.getElementById('gptpdf-zoom-value').textContent = zoom + '%';
    gptpdfSetSegment('gptpdf-margins', opts.margins || '');
    document.getElementById('gptpdf-margin-top').value = opts.margin_top || '0.4in';
    document.getElementById('gptpdf-margin-bottom').value = opts.margin_bottom || '0.4in';
    document.getElementById('gptpdf-margin-left').value = opts.margin_left || '0.4in';
    document.getElementById('gptpdf-margin-right').value = opts.margin_right || '0.4in';
    const customMargins = document.getElementById('gptpdf-margins-custom');
    if(customMargins) customMargins.style.display = opts.margins === 'custom' ? 'flex' : 'none';
    gptpdfSetSegment('gptpdf-page-break', opts.page_break || '');
    const pageBreakRow = document.getElementById('gptpdf-page-break') && document.getElementById('gptpdf-page-break').closest('.gptpdf-row');
    if(pageBreakRow) pageBreakRow.style.display = opts.single_page ? 'none' : '';
    // Theme palette
    const savedTheme = opts.q_color || 'default';
    const qColorInput = document.getElementById('gptpdf-q-color-value');
    if(qColorInput) qColorInput.value = savedTheme;
    document.querySelectorAll('#gptpdf-q-palette .gptpdf-palette-btn').forEach(function(btn) {
        const isActive = btn.getAttribute('data-color') === savedTheme;
        btn.style.outline = isActive ? '2px solid #EA4C3A' : 'none';
        btn.style.outlineOffset = isActive ? '2px' : '';
    });
    const sp = document.getElementById('gptpdf-singlepage-toggle'); if(sp) sp.checked = !!opts.single_page;
    gptpdfSetSegment('gptpdf-title-mode', opts.title_mode || '');
    gptpdfSetSegment('gptpdf-datetime', opts.datetime_format || 'none');
    gptpdfSetSegment('gptpdf-toc', opts.toc || '');
    const mn = document.getElementById('gptpdf-model-name'); if(mn) mn.checked = !!opts.model_name;
    const sl = document.getElementById('gptpdf-source-link'); if(sl) sl.checked = !!opts.source_link;
}

function gptpdfGetSettings() {
    return {
        page_size: gptpdfGetSegment('gptpdf-page-size') || 'a4',
        orientation: gptpdfGetSegment('gptpdf-orientation'),
        theme: gptpdfGetTheme(),
        zoom: parseInt(document.getElementById('gptpdf-zoom').value) || 100,
        margins: gptpdfGetSegment('gptpdf-margins'),
        margin_top: document.getElementById('gptpdf-margin-top').value,
        margin_bottom: document.getElementById('gptpdf-margin-bottom').value,
        margin_left: document.getElementById('gptpdf-margin-left').value,
        margin_right: document.getElementById('gptpdf-margin-right').value,
        page_break: gptpdfGetSegment('gptpdf-page-break'),
        q_color: (document.getElementById('gptpdf-q-color-value') || {value: 'default'}).value || 'default',
        q_color_picker: '#f4f4f4',
        q_fg_color: 'default',
        q_fg_color_picker: '#333333',
        q_align: 'right',
        q_rounded: true,
        no_icons: true,
        title_mode: gptpdfGetSegment('gptpdf-title-mode'),
        datetime_format: gptpdfGetSegment('gptpdf-datetime'),
        single_page: !!(document.getElementById('gptpdf-singlepage-toggle') || {}).checked,
        toc: gptpdfGetSegment('gptpdf-toc'),
        model_name: !!(document.getElementById('gptpdf-model-name') || {}).checked,
        source_link: !!(document.getElementById('gptpdf-source-link') || {}).checked,
    };
}

function gptpdfUpdatePreview(opts) {
    const doc = document.getElementById('gptpdf-preview-doc');
    if(!doc) return;
    const o = opts || gptpdfGetSettings();

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
    doc.querySelectorAll('.gptpdf-prev-line').forEach(l => { l.style.height = lineH; });
    doc.querySelectorAll('.gptpdf-prev-ai, .gptpdf-prev-user').forEach(b => { b.style.gap = gap; });

    // User prompt background (theme-aware)
    const users = doc.querySelectorAll('.gptpdf-prev-user');
    let userBg;
    const themeData = EXPORT_THEMES[o.q_color];
    if(o.q_color === 'none') userBg = 'transparent';
    else if(o.q_color === 'custom') userBg = o.q_color_picker || '#ecf9f2';
    else userBg = themeData
        ? (isDark ? themeData.darkPromptBg : themeData.promptBg)
        : (isDark ? 'rgba(255,255,255,0.08)' : '#f0f4f8');

    // Blockquote stripe color
    const bqBar = doc.querySelector('.gptpdf-prev-bq-bar');
    if(bqBar) {
        bqBar.style.background = themeData ? themeData.blockquote : '#d0d0d0';
    }
    users.forEach(u => {
        u.style.background = userBg;
        u.style.borderRadius = o.q_rounded ? '6px' : '2px';
    });

    // Text color: tint user-block lines with custom colour
    users.forEach(u => {
        u.querySelectorAll('.gptpdf-prev-line').forEach(l => {
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
        u.querySelectorAll('.gptpdf-prev-line').forEach(l => {
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
    const breakEl = document.getElementById('gptpdf-prev-break');
    if(breakEl) breakEl.style.display = o.page_break === 'after' ? 'block' : 'none';

    // Title
    const titleEl = doc.querySelector('.gptpdf-prev-title');
    if(titleEl) titleEl.style.display = o.title_mode === 'none' ? 'none' : 'block';

    // Creation date indicator
    const dateEl = doc.querySelector('.gptpdf-prev-date');
    if(dateEl) {
        dateEl.style.display = (o.datetime_format && o.datetime_format !== 'none') ? 'block' : 'none';
        dateEl.style.background = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)';
    }

    // Model name indicator
    const modelEl = doc.querySelector('.gptpdf-prev-model');
    if(modelEl) {
        modelEl.style.display = o.model_name ? 'block' : 'none';
        modelEl.style.background = isDark ? 'rgba(120,180,255,0.35)' : 'rgba(74,144,217,0.3)';
    }

    // Source link indicator
    const sourceEl = doc.querySelector('.gptpdf-prev-source');
    if(sourceEl) {
        sourceEl.style.display = o.source_link ? 'block' : 'none';
        sourceEl.style.background = isDark ? 'rgba(120,180,255,0.25)' : 'rgba(74,144,217,0.22)';
    }

    // TOC indicator
    const tocEl = doc.querySelector('.gptpdf-prev-toc');
    if(tocEl) {
        tocEl.style.display = o.toc ? 'flex' : 'none';
        const tocBlue = isDark ? '99,175,255' : '74,144,217';
        const isNumbered = o.toc === 'numbering';
        tocEl.querySelectorAll('.gptpdf-toc-dot').forEach((el, i) => {
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
        tocEl.querySelectorAll('.gptpdf-toc-line').forEach((el, i) => {
            el.style.background = i === 0 ? `rgba(${tocBlue},0.6)` : `rgba(${tocBlue},0.42)`;
        });
        tocEl.querySelectorAll('.gptpdf-toc-pg').forEach(el => {
            el.style.background = `rgba(${tocBlue},0.3)`;
        });
    }

    // User avatar dots
    doc.querySelectorAll('.gptpdf-prev-avatar').forEach(av => {
        av.style.display = o.no_icons ? 'none' : 'block';
        av.style.background = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.22)';
    });

}

// Wire up modal controls. Called from common.js init() AFTER the modal markup is
// injected into the page, so the event targets exist.
function wireSettings() {
    // Close on backdrop click or X
    document.getElementById('gptpdf-settings-overlay').addEventListener('click', function(e) {
        if(e.target === this) gptpdfCloseSettings();
    });
    document.getElementById('gptpdf-settings-close').addEventListener('click', gptpdfCloseSettings);

    // Segment buttons
    document.querySelectorAll('#gptpdf-settings-modal .gptpdf-segment').forEach(function(container) {
        container.querySelectorAll('.gptpdf-seg-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                container.querySelectorAll('.gptpdf-seg-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                if(container.id === 'gptpdf-margins') {
                    const customMargins = document.getElementById('gptpdf-margins-custom');
                    if(customMargins) customMargins.style.display = this.dataset.value === 'custom' ? 'flex' : 'none';
                }
                gptpdfUpdatePreview(null);
            });
        });
    });

    // Theme cards
    document.querySelectorAll('#gptpdf-theme .gptpdf-theme-card').forEach(function(card) {
        card.addEventListener('click', function() {
            document.querySelectorAll('#gptpdf-theme .gptpdf-theme-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            gptpdfUpdatePreview(null);
        });
    });

    // Build theme palette from EXPORT_THEMES
    const qPalette = document.getElementById('gptpdf-q-palette');
    if(qPalette) {
        Object.keys(EXPORT_THEMES).forEach(function(key) {
            const t = EXPORT_THEMES[key];
            const btn = document.createElement('button');
            btn.className = 'gptpdf-palette-btn';
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
        qPalette.querySelectorAll('.gptpdf-palette-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                qPalette.querySelectorAll('.gptpdf-palette-btn').forEach(function(b) {
                    b.style.outline = 'none';
                    b.style.outlineOffset = '';
                });
                this.style.outline = '2px solid #EA4C3A';
                this.style.outlineOffset = '2px';
                const inp = document.getElementById('gptpdf-q-color-value');
                if(inp) inp.value = this.getAttribute('data-color');
                gptpdfUpdatePreview(null);
            });
        });
    }

    // Slider
    const zoomSlider = document.getElementById('gptpdf-zoom');
    if(zoomSlider) zoomSlider.addEventListener('input', function() {
        document.getElementById('gptpdf-zoom-value').textContent = this.value + '%';
        gptpdfUpdatePreview(null);
    });

    // Toggles
    document.querySelectorAll('#gptpdf-settings-modal .gptpdf-toggle input').forEach(function(cb) {
        cb.addEventListener('change', function() { gptpdfUpdatePreview(null); });
    });

    // Apply
    document.getElementById('gptpdf-settings-apply').addEventListener('click', function() {
        gptpdfCloseSettings(); // Close first — don't depend on async callback
        try {
            const newOpts = gptpdfGetSettings();
            gptpdfShared.getOptions(function(existing) {
                newOpts.no_questions = existing.no_questions;
                chrome.storage.sync.set({options: newOpts});
            });
        } catch(e) {
            console.error('gptpdf settings save error:', e);
        }
    });

    // Reset
    document.getElementById('gptpdf-settings-reset').addEventListener('click', function() {
        gptpdfLoadSettings(gptpdfShared.defaultOptions);
        gptpdfUpdatePreview(gptpdfShared.defaultOptions);
    });
}
