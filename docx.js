'use strict';

// ── Word (.docx), 1.2.9 ────────────────────────────────────────────────────
// A Word file is a zip of XML parts. It is written here without a library,
// from the model formats.js reads out of the chat: headings, paragraphs and
// their runs, lists, tables, code, links, pictures, formulas (Word's own
// OMML, from MathML) — on the page Settings set (paper, margins, page numbers,
// a page per question) in the look it sets (font, size, spacing, questions).
// No dark sheet and no single long page: those are a PDF's.
// Fonts are ones Word, Google Docs and Pages have or replace in kind:
// the PDF's Noto and Carlito are not on people's computers.

const GPTPDF_DOCX_FONTS = {
    sans:   { name: 'Arial',   family: 'swiss',  panose: '020B0604020202020204' },
    serif:  { name: 'Georgia', family: 'roman',  panose: '02040502050405020303' },
    narrow: { name: 'Calibri', family: 'swiss',  panose: '020F0502020204030204' }
};
const GPTPDF_DOCX_MONO = { name: 'Consolas', family: 'modern', panose: '020B0609020204030204' };
const GPTPDF_DOCX_TBL_BORDERS = '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>' +
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>' +
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>' +
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/></w:tblBorders>';
const GPTPDF_DOCX_LH = { tight: 1.25, normal: 1.4, airy: 1.65 };
const GPTPDF_DOCX_GAP = { tight: 4, normal: 7, airy: 10 };     // pt after a paragraph

const GPTPDF_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const GPTPDF_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function gptpdfX(s) {
    return String(s == null ? '' : s)
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
        .replace(/[\ud800-\udbff](?![\udc00-\udfff])|(^|[^\ud800-\udbff])[\udc00-\udfff]/g, '$1')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gptpdfHex(c, dflt) {
    const s = String(c || '').trim();
    let m = /^#?([0-9a-f]{6})$/i.exec(s);
    if(m) return m[1].toUpperCase();
    m = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
    if(m) return (m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toUpperCase();
    return dflt || '';
}

// The first letter that has a direction decides the paragraph's (as ChatGPT's
// dir="auto" does on screen).
function gptpdfDocxRtl(text) {
    const m = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ֐-ࣿיִ-﷿ﹰ-ﻼ]/.exec(text || '');
    return !!m && /[֐-ࣿיִ-﷿ﹰ-ﻼ]/.test(m[0]);
}

async function gptpdfToDocx(model, options, title) {
    const look = gptpdfShared.look(options);
    const theme = (typeof EXPORT_THEMES !== 'undefined' && (EXPORT_THEMES[look.qColor] || EXPORT_THEMES['default'])) ||
        { promptBg: '#f4f4f4', tableHeader: '#f4f4f4', blockquote: '#d0d0d0', codeBg: '#f4f4f4', codeHeader: '#ebebeb' };
    const font = GPTPDF_DOCX_FONTS[look.font] || GPTPDF_DOCX_FONTS.sans;
    const size = look.size;
    const lh = GPTPDF_DOCX_LH[look.spacing] || 1.4;
    const gap = GPTPDF_DOCX_GAP[look.spacing] || 7;
    const letter = options.page_size === 'letter';
    const land = options.orientation === 'landscape';
    let pw = letter ? 12240 : 11906, ph = letter ? 15840 : 16838;
    if(land) { const t = pw; pw = ph; ph = t; }
    const mpx = typeof gptpdfMarginsPx === 'function' ? gptpdfMarginsPx(Object.assign({}, options, { single_page: false }))
        : { t: 68, b: 68, l: 76, r: 76 };
    const mg = { t: Math.round(mpx.t * 15), b: Math.round(mpx.b * 15), l: Math.round(mpx.l * 15), r: Math.round(mpx.r * 15) };
    const textW = pw - mg.l - mg.r;   // twips

    const rels = [];          // document relationships beyond the fixed ones
    const media = [];         // { name, bytes }
    const mediaBySrc = {};
    let relN = 10, picN = 1, numN = 2, bookN = 0;
    const nums = [];          // ordered lists: { id, start }
    const relFor = function(type, target, external) {
        const id = 'rId' + (relN++);
        rels.push('<Relationship Id="' + id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/' +
            type + '" Target="' + gptpdfX(target) + '"' + (external ? ' TargetMode="External"' : '') + '/>');
        return id;
    };

    // Pictures first (they are async): every data: picture becomes a file.
    const imgs = [];
    const collect = function(blocks) {
        (blocks || []).forEach(function(b) {
            if(b.t === 'img') imgs.push(b);
            (b.inl || []).forEach(function(x) { if(x.t === 'img') imgs.push(x); });
            if(b.blocks) collect(b.blocks);
            if(b.items) b.items.forEach(function(it) { collect(it.blocks); });
            if(b.rows) b.rows.forEach(function(r) { r.cells.forEach(function(c) { collect(c.blocks); }); });
        });
    };
    model.turns.forEach(function(t) { collect(t.blocks); });
    for(const img of imgs) {
        if(mediaBySrc[img.src] !== undefined) continue;
        mediaBySrc[img.src] = null;
        try {
            const pic = await gptpdfDocxPicture(img.src);
            if(pic) {
                const name = 'image' + (media.length + 1) + '.' + pic.ext;
                media.push({ name: name, bytes: pic.bytes });
                mediaBySrc[img.src] = { rid: relFor('image', 'media/' + name), w: pic.w, h: pic.h };
            }
        } catch(e) {
            console.log('[gptpdf] word picture', e);
        }
    }

    // ── runs ──
    const run = function(text, p) {
        p = p || {};
        let rpr = '';
        if(p.style) rpr += '<w:rStyle w:val="' + p.style + '"/>';
        if(p.b) rpr += '<w:b/><w:bCs/>';
        if(p.i) rpr += '<w:i/><w:iCs/>';
        if(p.s) rpr += '<w:strike/>';
        if(p.color) rpr += '<w:color w:val="' + p.color + '"/>';
        if(p.sz) rpr += '<w:sz w:val="' + Math.round(p.sz * 2) + '"/><w:szCs w:val="' + Math.round(p.sz * 2) + '"/>';
        if(p.sup) rpr += '<w:vertAlign w:val="superscript"/>';
        else if(p.sub) rpr += '<w:vertAlign w:val="subscript"/>';
        if(p.rtl) rpr += '<w:rtl/>';
        const parts = String(text).split('\t');
        let body = '';
        parts.forEach(function(s, k) {
            if(k) body += '<w:tab/>';
            if(s) body += '<w:t xml:space="preserve">' + gptpdfX(s) + '</w:t>';
        });
        return '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + body + '</w:r>';
    };
    const picture = function(img, maxW) {
        const m = mediaBySrc[img.src];
        if(!m) return run('[' + (img.alt || 'Picture') + ']', { i: true, color: '888888' });
        let w = img.w || m.w, h = img.h || m.h;
        if(!(w > 0 && h > 0)) { w = m.w; h = m.h; }
        // The faded reference in a question stays 28 px tall, as in the chat (formats.js).
        if(img.ref && m.w > 0 && m.h > 0) { w = 28 * m.w / m.h; h = 28; }
        const limit = (maxW || textW) / 15;       // px
        if(w > limit) { h = h * limit / w; w = limit; }
        const cx = Math.round(w * 9525), cy = Math.round(h * 9525);
        const id = picN++;
        return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
            '<wp:docPr id="' + id + '" name="Picture ' + id + '" descr="' + gptpdfX(img.alt || '') + '"/>' +
            '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
            '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
            '<pic:nvPicPr><pic:cNvPr id="' + id + '" name="Picture ' + id + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
            '<pic:blipFill><a:blip r:embed="' + m.rid + '"' + (img.ref ? '><a:alphaModFix amt="50000"/></a:blip>' : '/>') + '<a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
            '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    };
    const inlines = function(inl, base) {
        base = base || {};
        let xml = '';
        let i = 0;
        while(i < inl.length) {
            const x = inl[i];
            if(x.t === 'br') { xml += '<w:r><w:br/></w:r>'; i++; continue; }
            if(x.t === 'img') { xml += picture(x, base.maxW); i++; continue; }
            if(x.t === 'math') { xml += gptpdfDocxMath(x, false); i++; continue; }
            if(x.href) {
                let j = i, inner = '';
                while(j < inl.length && inl[j].t === 'text' && inl[j].href === x.href) {
                    inner += run(inl[j].v, Object.assign({}, base, inl[j], { style: inl[j].code ? 'CodeChar' : 'Hyperlink' }));
                    j++;
                }
                xml += '<w:hyperlink r:id="' + relFor('hyperlink', x.href, true) + '" w:history="1">' + inner + '</w:hyperlink>';
                i = j;
                continue;
            }
            xml += run(x.v, Object.assign({}, base, x, { style: x.code ? 'CodeChar' : base.style }));
            i++;
        }
        return xml;
    };
    const plain = function(inl) {
        return inl.map(function(x) { return x.t === 'text' ? x.v : ''; }).join('');
    };
    const para = function(pPr, content, text) {
        const rtl = gptpdfDocxRtl(text);
        let ppr = pPr || '';
        if(rtl) ppr = ppr.replace(/(<w:spacing|<w:ind|<w:jc|<w:outlineLvl|$)/, '<w:bidi/>$1');
        return '<w:p>' + (ppr ? '<w:pPr>' + ppr + '</w:pPr>' : '') + content + '</w:p>';
    };
    const pStyle = function(s) { return '<w:pStyle w:val="' + s + '"/>'; };

    // ── blocks ──
    const out = [];
    const blocks = function(list, ctx) {
        (list || []).forEach(function(b) { block(b, ctx || {}); });
    };
    const indentFor = function(ctx) {
        return ctx.indent ? '<w:ind w:left="' + ctx.indent + '"/>' : '';
    };
    const block = function(b, ctx) {
        const rtlRun = function(inl) { return gptpdfDocxRtl(plain(inl)); };
        switch(b.t) {
        case 'h': {
            const lvl = Math.min(6, Math.max(1, b.level));
            out.push(para(pStyle('Heading' + lvl) + indentFor(ctx), inlines(b.inl, { rtl: rtlRun(b.inl) }), plain(b.inl)));
            break;
        }
        case 'p': {
            const ppr = (ctx.style ? pStyle(ctx.style) : '') + (ctx.extra || '') + indentFor(ctx);
            out.push(para(ppr, inlines(b.inl, { rtl: rtlRun(b.inl), maxW: textW - (ctx.indent || 0) }), plain(b.inl)));
            break;
        }
        case 'code': {
            if(b.lang) out.push(para(pStyle('CodeLabel') + indentFor(ctx), run(b.lang), ''));
            const lines = b.text.split('\n');
            let xml = '';
            lines.forEach(function(l, k) {
                if(k) xml += '<w:r><w:br/></w:r>';
                if(l) xml += run(l.replace(/ /g, ' '));
            });
            out.push(para(pStyle('Code') + indentFor(ctx), xml || run(''), ''));
            break;
        }
        case 'list': {
            const depth = ctx.depth || 0;
            let numId = 1;
            if(b.ordered) {
                numId = numN++;
                nums.push({ id: numId, start: b.start || 1, lvl: depth });
            }
            b.items.forEach(function(it) {
                const itemBlocks = it.blocks.length ? it.blocks : [{ t: 'p', inl: [] }];
                itemBlocks.forEach(function(ib, k) {
                    if(k === 0 && ib.t === 'p') {
                        const box = it.check === true ? '☑ ' : (it.check === false ? '☐ ' : '');
                        const numPr = it.check === null || it.check === undefined
                            ? '<w:numPr><w:ilvl w:val="' + Math.min(8, depth) + '"/><w:numId w:val="' + numId + '"/></w:numPr>' : '';
                        const ind = numPr ? '' : '<w:ind w:left="' + (360 * (depth + 1)) + '"/>';
                        out.push(para(pStyle('ListParagraph') + numPr + ind,
                            (box ? run(box) : '') + inlines(ib.inl, { rtl: rtlRun(ib.inl), maxW: textW - 360 * (depth + 1) }),
                            plain(ib.inl)));
                    } else if(ib.t === 'list') {
                        block(ib, Object.assign({}, ctx, { depth: depth + 1 }));
                    } else {
                        block(ib, Object.assign({}, ctx, { indent: 360 * (depth + 1) + (ctx.indent || 0) }));
                    }
                });
            });
            break;
        }
        case 'table': {
            const cols = Math.max.apply(null, b.rows.map(function(r) { return r.cells.length; }));
            const avail = textW - (ctx.indent || 0);
            const colW = Math.floor(avail / Math.max(1, cols));
            // Borders and cell margins on the table itself, not only in its
            // style: Pages and Google Docs read these more surely.
            let xml = '<w:tbl><w:tblPr><w:tblStyle w:val="GptTable"/><w:tblW w:w="5000" w:type="pct"/>' +
                (ctx.indent ? '<w:tblInd w:w="' + ctx.indent + '" w:type="dxa"/>' : '') + GPTPDF_DOCX_TBL_BORDERS +
                '<w:tblLayout w:type="autofit"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="108" w:type="dxa"/>' +
                '<w:bottom w:w="40" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" ' +
                'w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr><w:tblGrid>';
            for(let k = 0; k < cols; k++) xml += '<w:gridCol w:w="' + colW + '"/>';
            xml += '</w:tblGrid>';
            b.rows.forEach(function(r, ri) {
                const head = ri === 0 && r.cells.every(function(c) { return c.head; });
                xml += '<w:tr>' + (head ? '<w:trPr><w:tblHeader/></w:trPr>' : '');
                for(let k = 0; k < cols; k++) {
                    const c = r.cells[k] || { blocks: [], head: false, align: '' };
                    const save = out.length;
                    const jc = c.align === 'right' ? '<w:jc w:val="right"/>' : (c.align === 'center' ? '<w:jc w:val="center"/>' : '');
                    (c.blocks.length ? c.blocks : [{ t: 'p', inl: [] }]).forEach(function(cb) {
                        if(cb.t === 'p' || cb.t === 'h') {
                            out.push(para(pStyle('TableText') + jc, inlines(cb.inl, { b: head || c.head, rtl: rtlRun(cb.inl), maxW: colW - 216 }),
                                plain(cb.inl)));
                        } else {
                            block(cb, { depth: 0, maxW: colW });
                        }
                    });
                    const inner = out.splice(save).join('') || '<w:p/>';
                    xml += '<w:tc><w:tcPr><w:tcW w:w="' + colW + '" w:type="dxa"/>' +
                        (head ? '<w:shd w:val="clear" w:color="auto" w:fill="' + gptpdfHex(theme.tableHeader, 'F4F4F4') + '"/>' : '') +
                        '</w:tcPr>' + inner + '</w:tc>';
                }
                xml += '</w:tr>';
            });
            xml += '</w:tbl>';
            out.push(xml);
            out.push(para(pStyle('TableGap'), '', ''));
            break;
        }
        case 'quote':
            blocks(b.blocks, Object.assign({}, ctx, { style: 'Quote' }));
            break;
        case 'hr':
            out.push(para(pStyle('Rule'), '', ''));
            break;
        case 'img':
            out.push(para(pStyle('Picture') + indentFor(ctx), picture(b, textW - (ctx.indent || 0)), ''));
            break;
        case 'math':
            out.push(para(pStyle('Formula') + indentFor(ctx), gptpdfDocxMath(b, true), ''));
            break;
        }
    };

    // ── the document: header, contents, the chat ──
    const head = gptpdfFmtHeader(options, title);
    const meta = [head.date].filter(Boolean);
    if(meta.length || head.url) {
        let xml = meta.length ? run(meta.join(' · '), { color: '888888', sz: Math.max(8, size - 2) }) : '';
        if(head.url) {
            if(xml) xml += run(' · ', { color: '888888', sz: Math.max(8, size - 2) });
            xml += '<w:hyperlink r:id="' + relFor('hyperlink', head.url, true) + '" w:history="1">' +
                run(head.url.replace(/^https?:\/\//, ''), { style: 'Hyperlink', sz: Math.max(8, size - 2) }) + '</w:hyperlink>';
        }
        out.push(para(pStyle('Meta'), xml, ''));
    }
    if(head.title) out.push(para(pStyle('Title'), run(head.title.replace(/\s+/g, ' ').trim()), head.title));

    const asHeading = look.qLook === 'heading';
    const qBg = gptpdfHex(theme.promptBg, '');
    const toc = options.toc && !options.no_questions ? gptpdfFmtTocItems(model) : [];
    if(toc.length > 1) {
        out.push(para(pStyle('TocHeading'), run('Contents'), ''));
        toc.forEach(function(it, k) {
            out.push(para(pStyle('TocItem'), '<w:hyperlink w:anchor="gptpdf_q' + it.turn + '" w:history="1">' +
                run((k + 1) + '. ' + it.text, { style: 'Hyperlink' }) + '</w:hyperlink>', it.text));
        });
    }

    let qCount = 0;
    model.turns.forEach(function(t, ti) {
        if(t.role !== 'user') { blocks(t.blocks, {}); return; }
        qCount++;
        const breakBefore = options.page_break === 'after' && qCount > 1;
        const first = out.length;
        t.blocks.forEach(function(b, k) {
            const last = k === t.blocks.length - 1;
            let ppr = pStyle(asHeading ? 'QuestionHeading' : 'Question');
            if(last) ppr += '<w:keepNext/>';
            if(k === 0 && breakBefore) ppr += '<w:pageBreakBefore/>';
            if(qBg && !(asHeading && qBg === 'FFFFFF')) ppr += '<w:shd w:val="clear" w:color="auto" w:fill="' + qBg + '"/>';
            if(k > 0) ppr += '<w:spacing w:before="0"/>';
            if(b.t === 'p') {
                out.push(para(ppr, inlines(b.inl, { b: asHeading, rtl: gptpdfDocxRtl(plain(b.inl)) }), plain(b.inl)));
            } else if(b.t === 'img') {
                out.push(para(ppr, picture(b, asHeading ? textW : textW * 0.7), ''));
            } else {
                block(b, {});
            }
        });
        if(out.length > first) {
            const id = bookN++;
            out[first] = out[first].replace(/(<\/w:pPr>|<w:p>)(?!.*<\/w:pPr>)/, '$1<w:bookmarkStart w:id="' + id +
                '" w:name="gptpdf_q' + ti + '"/><w:bookmarkEnd w:id="' + id + '"/>');
        }
    });

    const footer = !!options.page_numbers;
    const sect = '<w:sectPr>' + (footer ? '<w:footerReference w:type="default" r:id="rId4"/>' : '') +
        '<w:pgSz w:w="' + pw + '" w:h="' + ph + '"' + (land ? ' w:orient="landscape"' : '') + '/>' +
        '<w:pgMar w:top="' + mg.t + '" w:right="' + mg.r + '" w:bottom="' + mg.b + '" w:left="' + mg.l +
        '" w:header="425" w:footer="425" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>';
    const document = GPTPDF_XML + '<w:document ' + GPTPDF_NS + '><w:body>' + out.join('') + sect + '</w:body></w:document>';

    // ── the fixed parts ──
    const sz = function(pt) { return '<w:sz w:val="' + Math.round(pt * 2) + '"/><w:szCs w:val="' + Math.round(pt * 2) + '"/>'; };
    const fonts = function(f) {
        return '<w:rFonts w:ascii="' + f.name + '" w:hAnsi="' + f.name + '" w:cs="' + f.name + '" w:eastAsia="' + f.name + '"/>';
    };
    const line = Math.round(240 * lh);
    const after = Math.round(gap * 20);
    const style = function(id, name, ppr, rpr, extra) {
        return '<w:style w:type="paragraph" w:customStyle="1" w:styleId="' + id + '"><w:name w:val="' + name + '"/>' +
            '<w:basedOn w:val="Normal"/>' + (extra || '') + '<w:qFormat/>' +
            (ppr ? '<w:pPr>' + ppr + '</w:pPr>' : '') + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + '</w:style>';
    };
    const hSize = [0, 1.6, 1.35, 1.15, 1.05, 1, 1];
    let headings = '';
    for(let l = 1; l <= 6; l++) {
        headings += '<w:style w:type="paragraph" w:styleId="Heading' + l + '"><w:name w:val="heading ' + l + '"/>' +
            '<w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/>' +
            '<w:spacing w:before="' + Math.round(after * (l <= 2 ? 2.2 : 1.6)) + '" w:after="' + Math.round(after * 0.6) + '"/>' +
            '<w:outlineLvl w:val="' + (l - 1) + '"/></w:pPr><w:rPr><w:b/><w:bCs/>' + sz(size * hSize[l]) + '</w:rPr></w:style>';
    }
    const codeBg = gptpdfHex(theme.codeBg, 'F4F4F4');
    const codeBorder = '<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="E2E5E9"/>' +
        '<w:left w:val="single" w:sz="4" w:space="4" w:color="E2E5E9"/><w:bottom w:val="single" w:sz="4" w:space="4" w:color="E2E5E9"/>' +
        '<w:right w:val="single" w:sz="4" w:space="4" w:color="E2E5E9"/></w:pBdr>';
    const qIndent = asHeading ? '' : '<w:ind w:left="' + Math.round(textW * 0.3) + '"/>';
    const styles = GPTPDF_XML + '<w:styles ' + GPTPDF_NS + '>' +
        '<w:docDefaults><w:rPrDefault><w:rPr>' + fonts(font) + sz(size) +
        '<w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>' +
        '<w:pPrDefault><w:pPr><w:spacing w:after="' + after + '" w:line="' + line + '" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>' +
        '<w:rPr>' + fonts(font) + '<w:color w:val="1A1A1A"/>' + sz(size) + '</w:rPr></w:style>' +
        '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/>' +
        '<w:uiPriority w:val="1"/><w:semiHidden/></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>' +
        '<w:qFormat/><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="6" w:color="D0D0D0"/></w:pBdr>' +
        '<w:spacing w:before="60" w:after="' + Math.round(after * 2.4) + '" w:line="240" w:lineRule="auto"/></w:pPr>' +
        '<w:rPr><w:b/><w:bCs/>' + sz(Math.round(size * 1.8)) + '</w:rPr></w:style>' +
        headings +
        style('Meta', 'Chat details', '<w:jc w:val="right"/><w:spacing w:after="40"/>', '') +
        style('Question', 'Question', '<w:keepLines/><w:spacing w:before="' + Math.round(after * 2.6) + '" w:after="' + after + '"/>' +
            qIndent + '<w:outlineLvl w:val="0"/>', sz(size * 0.95)) +
        style('QuestionHeading', 'Question heading', '<w:keepLines/><w:spacing w:before="' + Math.round(after * 3) + '" w:after="' +
            after + '"/><w:outlineLvl w:val="0"/>', '<w:b/><w:bCs/>') +
        style('ListParagraph', 'List Paragraph', '<w:spacing w:after="' + Math.round(after * 0.45) + '"/>', '') +
        style('Code', 'Code', '<w:keepLines/>' + codeBorder + '<w:shd w:val="clear" w:color="auto" w:fill="' + codeBg + '"/>' +
            '<w:spacing w:before="60" w:after="' + Math.round(after * 1.4) + '" w:line="240" w:lineRule="auto"/><w:ind w:left="85" w:right="85"/>',
            fonts(GPTPDF_DOCX_MONO) + sz(Math.max(7.5, size - 2))) +
        style('CodeLabel', 'Code language', '<w:keepNext/><w:spacing w:before="120" w:after="0"/>',
            '<w:color w:val="6E7781"/>' + sz(Math.max(7, size - 2.5))) +
        style('Quote', 'Quote', '<w:pBdr><w:left w:val="single" w:sz="18" w:space="10" w:color="' +
            gptpdfHex(theme.blockquote, 'D0D0D0') + '"/></w:pBdr><w:ind w:left="284"/>', '') +
        style('Rule', 'Rule', '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D9D9D9"/></w:pBdr>' +
            '<w:spacing w:before="120" w:after="240" w:line="120" w:lineRule="auto"/>', '') +
        style('Picture', 'Picture', '<w:spacing w:before="60" w:after="' + after + '" w:line="240" w:lineRule="auto"/>', '') +
        style('Formula', 'Formula', '<w:jc w:val="center"/><w:spacing w:before="80" w:after="' + after + '"/>', '') +
        style('TableText', 'Table text', '<w:spacing w:before="40" w:after="40" w:line="' + Math.min(line, 288) + '" w:lineRule="auto"/>',
            sz(Math.max(7.5, size - 1))) +
        style('TableGap', 'Table gap', '<w:spacing w:after="0" w:line="120" w:lineRule="auto"/>', '') +
        style('TocHeading', 'Contents heading', '<w:keepNext/><w:spacing w:before="120" w:after="80"/>', '<w:b/><w:bCs/>') +
        style('TocItem', 'Contents item', '<w:spacing w:after="30"/><w:ind w:left="170"/>', sz(Math.max(8, size - 1.5))) +
        '<w:style w:type="character" w:customStyle="1" w:styleId="CodeChar"><w:name w:val="Code text"/><w:rPr>' +
        fonts(GPTPDF_DOCX_MONO) + '<w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/></w:rPr></w:style>' +
        '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:uiPriority w:val="99"/>' +
        '<w:rPr><w:color w:val="0B5CAD"/><w:u w:val="single"/></w:rPr></w:style>' +
        '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/>' +
        '<w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/>' +
        '<w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
        '<w:style w:type="table" w:customStyle="1" w:styleId="GptTable"><w:name w:val="Chat table"/><w:basedOn w:val="TableNormal"/>' +
        '<w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>' +
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>' +
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>' +
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/></w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/>' +
        '<w:left w:w="108" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
        '</w:styles>';

    const lvls = function(ordered) {
        const fmts = ['decimal', 'lowerLetter', 'lowerRoman'];
        const bullets = ['•', '◦', '▪'];
        let xml = '';
        for(let l = 0; l < 9; l++) {
            xml += '<w:lvl w:ilvl="' + l + '"><w:start w:val="1"/><w:numFmt w:val="' + (ordered ? fmts[l % 3] : 'bullet') + '"/>' +
                '<w:lvlText w:val="' + (ordered ? '%' + (l + 1) + '.' : bullets[l % 3]) + '"/><w:lvlJc w:val="left"/>' +
                '<w:pPr><w:ind w:left="' + (360 * (l + 1)) + '" w:hanging="300"/></w:pPr>' +
                (ordered ? '' : '<w:rPr><w:rFonts w:ascii="' + font.name + '" w:hAnsi="' + font.name + '"/></w:rPr>') + '</w:lvl>';
        }
        return xml;
    };
    let numbering = GPTPDF_XML + '<w:numbering ' + GPTPDF_NS + '>' +
        '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>' + lvls(false) + '</w:abstractNum>' +
        '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' + lvls(true) + '</w:abstractNum>' +
        '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
    nums.forEach(function(n) {
        numbering += '<w:num w:numId="' + n.id + '"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="' + Math.min(8, n.lvl) + '">' +
            '<w:startOverride w:val="' + n.start + '"/></w:lvlOverride></w:num>';
    });
    numbering += '</w:numbering>';

    const settings = GPTPDF_XML + '<w:settings ' + GPTPDF_NS + '><w:defaultTabStop w:val="720"/>' +
        '<w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" ' +
        'w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>';
    const fontTable = GPTPDF_XML + '<w:fonts ' + GPTPDF_NS + '>' + [font, GPTPDF_DOCX_MONO].map(function(f) {
        return '<w:font w:name="' + f.name + '"><w:panose1 w:val="' + f.panose + '"/><w:charset w:val="00"/>' +
            '<w:family w:val="' + f.family + '"/><w:pitch w:val="' + (f.family === 'modern' ? 'fixed' : 'variable') + '"/></w:font>';
    }).join('') + '</w:fonts>';
    const footerXml = GPTPDF_XML + '<w:ftr ' + GPTPDF_NS + '><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>' +
        '<w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:color w:val="888888"/>' + sz(Math.max(8, size - 2)) +
        '</w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>';

    const docRels = GPTPDF_XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
        (footer ? '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' : '') +
        '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>' +
        rels.join('') + '</Relationships>';
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const core = GPTPDF_XML + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + gptpdfX(title || '') + '</dc:title>' +
        '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created>' +
        '<dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified></cp:coreProperties>';
    const app = GPTPDF_XML + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
        '<Application>ExportGPT</Application></Properties>';
    const exts = {};
    media.forEach(function(m) { exts[m.name.split('.').pop()] = true; });
    const mime = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif' };
    const types = GPTPDF_XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        Object.keys(exts).map(function(e) { return '<Default Extension="' + e + '" ContentType="' + mime[e] + '"/>'; }).join('') +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
        '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>' +
        (footer ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : '') +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
        '</Types>';
    const pkgRels = GPTPDF_XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
        '</Relationships>';

    const enc = new TextEncoder();
    const files = [
        { name: '[Content_Types].xml', data: enc.encode(types) },
        { name: '_rels/.rels', data: enc.encode(pkgRels) },
        { name: 'docProps/core.xml', data: enc.encode(core) },
        { name: 'docProps/app.xml', data: enc.encode(app) },
        { name: 'word/document.xml', data: enc.encode(document) },
        { name: 'word/styles.xml', data: enc.encode(styles) },
        { name: 'word/numbering.xml', data: enc.encode(numbering) },
        { name: 'word/settings.xml', data: enc.encode(settings) },
        { name: 'word/fontTable.xml', data: enc.encode(fontTable) },
        { name: 'word/_rels/document.xml.rels', data: enc.encode(docRels) }
    ];
    if(footer) files.push({ name: 'word/footer1.xml', data: enc.encode(footerXml) });
    media.forEach(function(m) { files.push({ name: 'word/media/' + m.name, data: m.bytes, store: true }); });
    return gptpdfZip(files);
}

// A picture for the file: PNG, JPEG and GIF go as they are, their size read
// from their own header (no decoding) — unless heavy (gptpdfDocxPicture below);
// anything else (WebP, AVIF, SVG) is drawn once into a PNG or a JPEG — Word
// reads only the old kinds.
function gptpdfImageSize(b, ext) {
    if(ext === 'png' && b.length > 24) {
        return { w: ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0, h: ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0 };
    }
    if(ext === 'gif' && b.length > 10) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
    if(ext === 'jpeg') {
        let i = 2;
        while(i + 9 < b.length) {
            if(b[i] !== 0xff) { i++; continue; }
            const mk = b[i + 1];
            if(mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) {
                return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
            }
            if(mk === 0xd8 || mk === 0x01 || (mk >= 0xd0 && mk <= 0xd7)) { i += 2; continue; }
            i += 2 + ((b[i + 2] << 8) | b[i + 3]);
        }
    }
    return { w: 0, h: 0 };
}

// A heavy picture goes in lighter. ChatGPT's pictures are 1024 px PNGs of
// 1.5–2.5 MB: 59 of them made the author's «мудрец» an 88 MB file (18.11), and
// Google Docs does not open a .docx over 50 MB. Redrawn as JPEG when nothing in
// it is see-through (about a tenth of the weight), and no wider than 1600 px —
// a page's text is 6.7 inches wide, 1600 px prints sharp on it.
const GPTPDF_DOCX_LIGHT_FROM = 300 * 1024;   // bytes
const GPTPDF_DOCX_MAX_PX = 1600;
const GPTPDF_DOCX_JPEG_Q = 0.86;

async function gptpdfDocxPicture(src) {
    const m = /^data:(image\/[a-z0-9.+-]+)(;base64)?,(.*)$/i.exec(src || '');
    if(!m) return null;
    const type = m[1].toLowerCase();
    let bytes;
    if(m[2]) {
        const bin = atob(m[3]);
        bytes = new Uint8Array(bin.length);
        for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
        bytes = new TextEncoder().encode(decodeURIComponent(m[3]));
    }
    const heavy = bytes.length >= GPTPDF_DOCX_LIGHT_FROM;
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/gif': 'gif' }[type];
    if(ext) {
        const s = gptpdfImageSize(bytes, ext);
        if(s.w > 0 && s.h > 0) {
            const big = Math.max(s.w, s.h) > GPTPDF_DOCX_MAX_PX;
            if(heavy && (ext === 'png' || (ext === 'jpeg' && big))) {
                const light = await gptpdfDocxRedraw(src, true);
                if(light && light.bytes.length < bytes.length) return light;
            }
            return { bytes: bytes, ext: ext, w: s.w, h: s.h };
        }
    }
    // WebP, AVIF, SVG: Word reads only the old kinds.
    return gptpdfDocxRedraw(src, heavy);
}

// Drawn once on a canvas: as a JPEG when allowed and nothing in it is
// see-through, as a PNG otherwise; no wider than GPTPDF_DOCX_MAX_PX.
async function gptpdfDocxRedraw(src, light) {
    const im = await new Promise(function(resolve) {
        const el = new Image();
        el.onload = function() { resolve(el); };
        el.onerror = function() { resolve(null); };
        el.src = src;
    });
    if(!im || !(im.naturalWidth > 0 && im.naturalHeight > 0)) return null;
    let w = im.naturalWidth, h = im.naturalHeight;
    if(light && Math.max(w, h) > GPTPDF_DOCX_MAX_PX) {
        const k = GPTPDF_DOCX_MAX_PX / Math.max(w, h);
        w = Math.round(w * k); h = Math.round(h * k);
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, w, h);
    let opaque = false;
    if(light) {
        try {
            const d = g.getImageData(0, 0, w, h).data;
            opaque = true;
            for(let i = 3; i < d.length; i += 4) {
                if(d[i] < 255) { opaque = false; break; }
            }
        } catch(e) {
            opaque = false;
        }
    }
    const url = opaque ? c.toDataURL('image/jpeg', GPTPDF_DOCX_JPEG_Q) : c.toDataURL('image/png');
    const bin = atob(url.split(',')[1]);
    const out = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return { bytes: out, ext: opaque ? 'jpeg' : 'png', w: w, h: h };
}

// ── formulas: MathML → OMML ───────────────────────────────────────────────
const GPTPDF_NARY = '∑∏∐∫∬∭∮∯∰⋃⋂⨁⨂⨀⨄⋁⋀';
const GPTPDF_ACCENT = { '→': '⃗', '⃗': '⃗', '^': '̂', 'ˆ': '̂', '~': '̃', '˜': '̃',
    '¯': '̅', '‾': '̅', 'ˉ': '̅', '˙': '̇', '¨': '̈', '´': '́', '`': '̀', 'ˇ': '̌' };

function gptpdfDocxMath(node, display) {
    let math = node.mathml || null;
    if(!math && node.tex && typeof katex !== 'undefined') {
        try {
            const html = katex.renderToString(node.tex, { output: 'mathml', displayMode: !!display, throwOnError: true, strict: 'ignore' });
            math = new DOMParser().parseFromString(html, 'text/html').querySelector('math');
        } catch(e) {
            math = null;
        }
    }
    if(!math) return '<w:r><w:t xml:space="preserve">' + gptpdfX(node.tex || '') + '</w:t></w:r>';
    const omml = '<m:oMath>' + gptpdfOmmlKids(math) + '</m:oMath>';
    return display ? '<m:oMathPara>' + omml + '</m:oMathPara>' : omml;
}

function gptpdfOmmlR(text, sty, scr) {
    if(!text) return '';
    let rpr = '';
    if(scr) rpr += '<m:scr m:val="' + scr + '"/>';
    if(sty === 'nor') rpr += '<m:nor/>';
    else if(sty) rpr += '<m:sty m:val="' + sty + '"/>';
    return '<m:r>' + (rpr ? '<m:rPr>' + rpr + '</m:rPr>' : '') + '<m:t xml:space="preserve">' + gptpdfX(text) + '</m:t></m:r>';
}

function gptpdfOmmlKids(el) {
    return gptpdfOmmlList(Array.from(el.children));
}

function gptpdfOmmlList(list) {
    const kids = list.filter(function(k) { return k.localName !== 'annotation' && k.localName !== 'annotation-xml'; });
    let xml = '';
    for(let i = 0; i < kids.length; i++) {
        const k = kids[i];
        // A big operator takes what follows it as its body.
        const nary = gptpdfOmmlNaryBase(k);
        if(nary) {
            const body = kids[i + 1] ? gptpdfOmml(kids[i + 1]) : '';
            xml += gptpdfOmmlNary(k, nary, body);
            if(kids[i + 1]) i++;
            continue;
        }
        xml += gptpdfOmml(k);
    }
    return xml;
}

function gptpdfOmmlNaryBase(el) {
    const n = el.localName;
    let base = null;
    if(n === 'mo' && GPTPDF_NARY.indexOf(el.textContent.trim()) !== -1) base = el;
    else if(/^(munderover|munder|mover|msubsup|msub|msup)$/.test(n) && el.children[0] &&
            el.children[0].localName === 'mo' && GPTPDF_NARY.indexOf(el.children[0].textContent.trim()) !== -1) base = el.children[0];
    return base ? base.textContent.trim() : null;
}

function gptpdfOmmlNary(el, chr, body) {
    const n = el.localName;
    let sub = '', sup = '';
    if(n === 'munderover' || n === 'msubsup') { sub = gptpdfOmml(el.children[1]); sup = gptpdfOmml(el.children[2]); }
    else if(n === 'munder' || n === 'msub') sub = gptpdfOmml(el.children[1]);
    else if(n === 'mover' || n === 'msup') sup = gptpdfOmml(el.children[1]);
    const under = /^(munderover|munder|mover)$/.test(n);
    return '<m:nary><m:naryPr><m:chr m:val="' + gptpdfX(chr) + '"/><m:limLoc m:val="' + (under ? 'undOvr' : 'subSup') + '"/>' +
        (sub ? '' : '<m:subHide m:val="1"/>') + (sup ? '' : '<m:supHide m:val="1"/>') + '</m:naryPr>' +
        '<m:sub>' + sub + '</m:sub><m:sup>' + sup + '</m:sup><m:e>' + body + '</m:e></m:nary>';
}

function gptpdfOmml(el) {
    if(!el) return '';
    const n = el.localName;
    const c = el.children;
    const one = function(k) { return gptpdfOmml(c[k]); };
    switch(n) {
    case 'mi': {
        const t = el.textContent;
        const v = el.getAttribute('mathvariant') || '';
        const scr = { 'double-struck': 'double-struck', script: 'script', fraktur: 'fraktur', 'sans-serif': 'sans-serif',
                      monospace: 'monospace' }[v];
        if(scr) return gptpdfOmmlR(t, 'p', scr);
        if(v === 'bold') return gptpdfOmmlR(t, 'b');
        if(v === 'bold-italic') return gptpdfOmmlR(t, 'bi');
        if(v === 'normal' || t.length > 1) return gptpdfOmmlR(t, 'p');
        return gptpdfOmmlR(t);
    }
    case 'mn': return gptpdfOmmlR(el.textContent);
    case 'mo': return gptpdfOmmlR(el.textContent);
    case 'mtext': case 'ms': return gptpdfOmmlR(el.textContent.replace(/ /g, ' '), 'nor');
    case 'mspace': return '';
    case 'mfrac': {
        const bar = el.getAttribute('linethickness');
        return '<m:f>' + (bar === '0' || bar === '0px' || bar === '0em' ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : '') +
            '<m:num>' + one(0) + '</m:num><m:den>' + one(1) + '</m:den></m:f>';
    }
    case 'msup': return '<m:sSup><m:e>' + one(0) + '</m:e><m:sup>' + one(1) + '</m:sup></m:sSup>';
    case 'msub': return '<m:sSub><m:e>' + one(0) + '</m:e><m:sub>' + one(1) + '</m:sub></m:sSub>';
    case 'msubsup': return '<m:sSubSup><m:e>' + one(0) + '</m:e><m:sub>' + one(1) + '</m:sub><m:sup>' + one(2) + '</m:sup></m:sSubSup>';
    case 'msqrt': return '<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>' + gptpdfOmmlKids(el) + '</m:e></m:rad>';
    case 'mroot': return '<m:rad><m:deg>' + one(1) + '</m:deg><m:e>' + one(0) + '</m:e></m:rad>';
    case 'mover': {
        const mark = c[1] ? c[1].textContent.trim() : '';
        if(el.getAttribute('accent') === 'true' || (GPTPDF_ACCENT[mark] && mark.length === 1)) {
            if(mark === '‾' || mark === '¯' || (c[1] && c[1].getAttribute && c[1].getAttribute('stretchy') === 'true' && /[‾¯_]/.test(mark))) {
                return '<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>' + one(0) + '</m:e></m:bar>';
            }
            return '<m:acc><m:accPr><m:chr m:val="' + gptpdfX(GPTPDF_ACCENT[mark] || mark) + '"/></m:accPr><m:e>' + one(0) + '</m:e></m:acc>';
        }
        return '<m:limUpp><m:e>' + one(0) + '</m:e><m:lim>' + one(1) + '</m:lim></m:limUpp>';
    }
    case 'munder':
        if(c[1] && /^[_‾¯]$/.test(c[1].textContent.trim())) {
            return '<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr><m:e>' + one(0) + '</m:e></m:bar>';
        }
        return '<m:limLow><m:e>' + one(0) + '</m:e><m:lim>' + one(1) + '</m:lim></m:limLow>';
    case 'munderover':
        return '<m:limUpp><m:e><m:limLow><m:e>' + one(0) + '</m:e><m:lim>' + one(1) + '</m:lim></m:limLow></m:e><m:lim>' +
            one(2) + '</m:lim></m:limUpp>';
    case 'mtable': {
        let rows = '';
        let cols = 0;
        Array.from(c).forEach(function(tr) {
            const cells = Array.from(tr.children).filter(function(td) { return td.localName === 'mtd'; });
            cols = Math.max(cols, cells.length);
            rows += '<m:mr>' + cells.map(function(td) { return '<m:e>' + gptpdfOmmlKids(td) + '</m:e>'; }).join('') + '</m:mr>';
        });
        return '<m:m><m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="' + Math.max(1, cols) + '"/><m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs></m:mPr>' +
            rows + '</m:m>';
    }
    case 'mrow': {
        const k = Array.from(c);
        const fence = function(x) { return x && x.localName === 'mo' && (x.getAttribute('fence') === 'true' || x.getAttribute('stretchy') === 'true'); };
        if(k.length >= 2 && fence(k[0]) && fence(k[k.length - 1])) {
            const body = gptpdfOmmlList(k.slice(1, -1));
            return '<m:d><m:dPr><m:begChr m:val="' + gptpdfX(k[0].textContent.trim()) + '"/><m:endChr m:val="' +
                gptpdfX(k[k.length - 1].textContent.trim()) + '"/></m:dPr><m:e>' + body + '</m:e></m:d>';
        }
        return gptpdfOmmlKids(el);
    }
    case 'menclose': case 'mstyle': case 'mpadded': case 'semantics': case 'math': case 'mphantom': case 'merror':
        return gptpdfOmmlKids(el);
    default:
        return el.children.length ? gptpdfOmmlKids(el) : gptpdfOmmlR(el.textContent);
    }
}

// ── zip ───────────────────────────────────────────────────────────────────
const GPTPDF_CRC = (function() {
    const t = new Uint32Array(256);
    for(let n = 0; n < 256; n++) {
        let c = n;
        for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function gptpdfCrc32(bytes) {
    let c = 0xffffffff;
    for(let i = 0; i < bytes.length; i++) c = GPTPDF_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

async function gptpdfDeflateRaw(bytes) {
    if(typeof CompressionStream === 'undefined') return null;
    let raw = true, cs;
    try { cs = new CompressionStream('deflate-raw'); } catch(e) { raw = false; cs = new CompressionStream('deflate'); }
    const out = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer());
    return raw ? out : out.subarray(2, out.length - 4);   // zlib: 2-byte head, 4-byte check
}

async function gptpdfZip(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [], central = [];
    let offset = 0;
    for(const f of files) {
        const name = enc.encode(f.name);
        const crc = gptpdfCrc32(f.data);
        let body = f.data, method = 0;
        if(!f.store && f.data.length > 64) {
            try {
                const z = await gptpdfDeflateRaw(f.data);
                if(z && z.length < f.data.length) { body = z; method = 8; }
            } catch(e) { /* stored */ }
        }
        const h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
        h.setUint16(8, method, true); h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true);
        h.setUint32(14, crc, true); h.setUint32(18, body.length, true); h.setUint32(22, f.data.length, true);
        h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
        parts.push(new Uint8Array(h.buffer), name, body);
        const cd = new DataView(new ArrayBuffer(46));
        cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true);
        cd.setUint16(8, 0x0800, true); cd.setUint16(10, method, true); cd.setUint16(12, dosTime, true);
        cd.setUint16(14, dosDate, true); cd.setUint32(16, crc, true); cd.setUint32(20, body.length, true);
        cd.setUint32(24, f.data.length, true); cd.setUint16(28, name.length, true);
        cd.setUint32(42, offset, true);
        central.push(new Uint8Array(cd.buffer), name);
        offset += 30 + name.length + body.length;
    }
    const cdSize = central.reduce(function(s, a) { return s + a.length; }, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    const all = parts.concat(central, [new Uint8Array(end.buffer)]);
    const total = all.reduce(function(s, a) { return s + a.length; }, 0);
    const zip = new Uint8Array(total);
    let p = 0;
    all.forEach(function(a) { zip.set(a, p); p += a.length; });
    return zip;
}
