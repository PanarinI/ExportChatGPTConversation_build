'use strict';

// Standalone DOM / utility helpers — pure-ish: take inputs, use only DOM/window
// and each other, never init() state. Extracted from common.js; shared globally
// across the content scripts (loaded before common.js).

// ── Two ChatGPT layouts ───────────────────────────────────────────────────
// Since ~2026-09-21 ChatGPT rolls out a new layout account by account, and a
// tab opened before the switch keeps the old one until reload, so both live
// side by side (CHATGPT-DOM.md §9):
//   • classic — one turn per message: [data-testid="conversation-turn-N"],
//     [data-message-author-role], [data-message-id], .markdown;
//   • pair    — one turn per question AND its answer: div[data-turn-key].
// The live page is read in whichever layout it has; the export copy is
// translated to the classic shape (gptpdfNormalizeTurns, render.js), so the
// cleanup, TOC, "answers only" and page breaks work on both unchanged.
const GPTPDF_TURN = '[data-testid^="conversation-turn"], div[data-turn-key]';

function gptpdfIsPairTurn(el) {
    return !!(el && el.hasAttribute && el.hasAttribute('data-turn-key'));
}

function gptpdfIsPairLayout(root) {
    return !!(root || document).querySelector('div[data-turn-key]');
}

// Analytics label for the page an export ran on: 'pair' | 'classic'.
function gptpdfLayoutName() {
    return gptpdfIsPairLayout() ? 'pair' : 'classic';
}

// Is a conversation open? The Export button lights up on this. Until 09-26 it
// asked only for the classic user message, so on the pair layout the button
// stayed dimmed on an open chat — "always said load a chat" (ГОЛОСА 09-26).
function gptpdfHasConversation(root) {
    return !!(root || document).querySelector(
        '[data-message-author-role="user"], div[data-turn-key]');
}

// A blob: URL lives only inside this tab, so the render server can never open
// it — the picture must travel inline. The pair layout serves generated images
// this way (CHATGPT-DOM.md §9); before, blob: images were skipped and reached
// the PDF as a broken-image glyph. Reading the blob keeps its own bytes and
// format; a loaded <img> can also be copied through a canvas (a blob the page
// made is same-origin, so the canvas is not tainted). Resolves to a data: URL,
// or null when the blob is gone.
function gptpdfBlobToDataUrl(src, img) {
    return fetch(src).then(function(r) {
        return r.blob();
    }).then(function(blob) {
        return new Promise(function(resolve) {
            const fr = new FileReader();
            fr.onload = function() { resolve(fr.result); };
            fr.onerror = function() { resolve(null); };
            fr.readAsDataURL(blob);
        });
    }).catch(function() {
        return null;
    }).then(function(dataUrl) {
        if(dataUrl || !img || !img.complete || !img.naturalWidth) {
            return dataUrl;
        }
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            return canvas.toDataURL('image/png');
        } catch(e) {
            return null;
        }
    });
}

// Inline one blob: <img> in place; leaves its src alone if nothing came back.
function gptpdfInlineBlobImage(img, liveImg) {
    const src = img.getAttribute('src') || '';
    return gptpdfBlobToDataUrl(src, liveImg || img).then(function(dataUrl) {
        if(dataUrl) {
            img.setAttribute('src', dataUrl);
            gptpdfImageQueue.blobOk++;
        } else {
            gptpdfImageQueue.blobLost++;
        }
    });
}

// Pictures behind ChatGPT's login (files.oaiusercontent.com …) reach the PDF
// only as data: URLs, fetched by the background page with the person's
// cookies. Until 1.2.0 every picture of a chat was asked for at once, each
// with 5 s and no second try: on a chat with 61 pictures some always ran out
// of time, and the PDF kept their empty frames — 35, 36, 40 or 38 pictures in
// four exports of the same chat (author's «Художник_базовый», 07.10; the
// cause was written down on 08-22 and left open). Now: at most four at a time,
// 20 s each (background.js), one more try, and a count of what got lost.
const GPTPDF_IMAGE_PARALLEL = 4;
const gptpdfImageQueue = { active: 0, waiting: [], ok: 0, failed: 0,
                           blobOk: 0, blobLost: 0, unframed: 0, left: '' };

function gptpdfImageStatsReset() {
    const q = gptpdfImageQueue;
    q.ok = q.failed = q.blobOk = q.blobLost = q.unframed = 0;
    q.left = '';
}

// What reached the PDF as a picture and what did not: every <img> of the
// export page that is still a link (not data:) will be an empty frame in the
// PDF — the server cannot open ChatGPT's links. Counted by kind of link, so a
// loss names its path (07.10: the first count showed the queue was not even
// on the path of that chat's pictures).
function gptpdfCountPictures(html) {
    const kinds = {};
    let embedded = 0;
    const re = /<img\b[^>]*?\ssrc="([^"]*)"/gi;
    let m;
    while((m = re.exec(html))) {
        const src = m[1];
        if(src.startsWith('data:')) {
            if(src.length > 2000) embedded++;   // not a favicon blank
            continue;
        }
        const kind = src.startsWith('blob:') ? 'blob' :
            /oaiusercontent\.com|images\.openai\.com/.test(src) ? 'files' :
            /^https?:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(src) ? 'chatgpt' :
            (src ? 'other' : 'empty');
        kinds[kind] = (kinds[kind] || 0) + 1;
    }
    return { embedded: embedded, left: kinds };
}

function gptpdfFetchImageOnce(src) {
    return new Promise(function(resolve) {
        try {
            chrome.runtime.sendMessage({ action: 'fetchImageAsBase64', src: src },
                function(response) {
                    resolve(response && response.data ? response.data : null);
                });
        } catch(e) {
            resolve(null);
        }
    });
}

// A picture served from ChatGPT's own file storage keeps that
// fact as a mark once it is data:, and extractDalleImages takes every marked
// picture out of ChatGPT's frame — whatever its type and weight. Until 1.2.0
// the frame was opened only for a PNG of 500 000+ characters, which is what the
// canvas makes of a picture that has loaded on the page. A picture not loaded
// yet came through the background in the server's own type (webp), stayed in
// its frame and did not print at all, not even as an empty box (07.10, the
// author's «Художник_базовый»: 7 of 40 lost — exactly the 7 fetched; the
// 08-22 open tail of CHATGPT-DOM §7: decide by what it is, not by weight).
// What in the frame hides it is not measured; the page's own "not loaded
// yet" look of that frame is the likely part. Questions too (08.10): an
// uploaded photo that had not loaded came the same way and vanished from the
// author's «Pineapple Express» on the first export after opening the chat,
// while a loaded one was taken out by the weight rule all along — so leaving
// questions out kept no "thumbnail size as before", only the loss.
const GPTPDF_PICTURE_HOST =
    /^https:\/\/(chatgpt\.com\/backend-api\/|[a-z0-9.-]*\.oaiusercontent\.com\/)/;

// An icon or a variant's thumbnail (the strip of a generated picture's
// versions, 56 px) is not a picture to take out: it would print full width.
const GPTPDF_PICTURE_MIN_PX = 96;

function gptpdfMarkPicture(img, src) {
    if(!GPTPDF_PICTURE_HOST.test(src || '')) {
        return;
    }
    const attrW = parseInt(img.getAttribute('width') || '0', 10);
    // The second pass works on the detached copy, which has no layout: there
    // the size the first pass stamped on the live <img> stands in (review
    // 07.10: a 56 px variant whose first fetches failed came out full width).
    const shownW = img.isConnected ? img.getBoundingClientRect().width :
        parseInt(img.getAttribute('data-gptpdf-w') || '0', 10);
    if((attrW > 0 && attrW < GPTPDF_PICTURE_MIN_PX) ||
       (shownW > 0 && shownW < GPTPDF_PICTURE_MIN_PX)) {
        return;
    }
    img.setAttribute('data-gptpdf-pic', '');
}

// The first pass works on the LIVE page: the canvas needs the loaded <img>,
// the size stamps need its layout. Until 1.2.0 it also left the page so —
// pictures written in as data:, which every later export of the same page
// load then skipped, keeping whatever the first one got (07.10: the same 7
// pictures lost in two exports in a row, all back after a reload). Once the
// copy is taken, the page gets its own pictures back.
function gptpdfLiveImagesSave(img, saved) {
    if(!img.hasAttribute('data-gptpdf-live')) {
        img.setAttribute('data-gptpdf-live', '');
        saved.push({ img: img, src: img.getAttribute('src') });
    }
}

// Only what the export wrote is put back: a data: copy over the page's own
// link. A src the page itself changed meanwhile is the page's.
function gptpdfLiveImagesRestore(saved) {
    saved.forEach(function(s) {
        const now = s.img.getAttribute('src') || '';
        if(s.src && !s.src.startsWith('data:') && now !== s.src &&
           now.startsWith('data:')) {
            s.img.setAttribute('src', s.src);
        }
        ['data-gptpdf-live', 'data-gptpdf-w', 'data-gptpdf-h', 'data-gptpdf-pic']
            .forEach(function(a) { s.img.removeAttribute(a); });
    });
    saved.length = 0;
}

// Citation favicons are blanked in the PDF anyway (render.js, step 2b), and
// their server does not answer the background: each export counted dozens of
// them as lost pictures (08.10: «lost 38» on a chat with two pictures).
const GPTPDF_FAVICON = /google\.com\/s2\/favicons|gstatic\.com\/faviconV2/;

// Resolves to a data: URL, or null when both tries failed.
function gptpdfFetchImageData(src) {
    if(GPTPDF_FAVICON.test(src || '')) {
        return Promise.resolve(null);
    }
    const q = gptpdfImageQueue;
    return new Promise(function(resolve) {
        const run = function() {
            q.active++;
            gptpdfFetchImageOnce(src).then(function(data) {
                return data || gptpdfFetchImageOnce(src);
            }).then(function(data) {
                if(data) { q.ok++; } else { q.failed++; }
                q.active--;
                const next = q.waiting.shift();
                if(next) next();
                resolve(data);
            });
        };
        if(q.active < GPTPDF_IMAGE_PARALLEL) {
            run();
        } else {
            q.waiting.push(run);
        }
    });
}

function findRow(element) {
    return element.closest(
        'section[data-testid^="conversation-turn"]'
    ) || element.closest('div[data-turn-key]') || element.closest('article');
}

// Coarse bucket for a failed export, used as the `reason` param on the
// export_failed analytics event. Pure (no DOM) so it is unit-tested
// (tests/failreason-test.html). Keep the buckets few and low-cardinality:
//   fair_use  — 432, deliberate usage limit
//   too_large — 503 / Gotenberg api-timeout: server couldn't render in time
//   network   — fetch never reached the service (offline, or an AV/security
//               extension blocking the request — the silent "not works")
//   http_<n>  — any other HTTP status from the service
//   client    — failed before the request (stale extension, chunk error, throw)
function gptpdfFailureReason(status, text) {
    if(status == 432) return 'fair_use';
    if(status == 503 ||
       (text && /time limit|timeout|--api-timeout/i.test(text))) {
        return 'too_large';
    }
    if(status == 'network-error') return 'network';
    if(status) return 'http_' + status;
    return 'client';
}

function hasParent(element, parent) {
    while(element) {
        if(element === parent) {
            return true;
        }
        element = element.parentElement;
    }
    return false;
}

// True when a <button> wraps a REAL content image (a user-uploaded picture or a
// generated image) rather than being an action button or a citation/"Sources"
// button whose only <img>s are tiny favicons. The export cleanup uses this to KEEP
// such images (unwrap the button) instead of deleting the button with the image
// inside it — the "no pictures in the PDF" bug: ChatGPT wraps uploaded images in a
// labeled <button aria-label="Open image: …">, and the old rule removed every
// labeled button outright. A content image is detected by the size our capture
// stamped on it (data-gptpdf-w) or by a real inline data: image — never the 1px
// favicon-blank gif. Pure DOM (candidate for a tests/ stand).
function gptpdfButtonWrapsContentImage(btn) {
    if(!btn || !btn.querySelectorAll) return false;
    const imgs = btn.querySelectorAll('img');
    for(let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        if(parseInt(img.getAttribute('data-gptpdf-w') || '0', 10) > 64) return true;
        const src = img.getAttribute('src') || '';
        if(/^data:image\/(png|jpe?g|webp)/i.test(src) && src.length > 2000) return true;
    }
    return false;
}

function addImgBase64Src(element) {
    const images = element.querySelectorAll('img');

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const src = img.getAttribute('src');

        if (!src ||
            !src.startsWith('https://chatgpt.com/backend-api/') ||
            img.hasAttribute('data-gptpdf-img-src')) {
            continue;
        }

        // Skip if image is not yet loaded
        if (!img.complete || img.naturalWidth === 0) {
            continue;
        }

        const canvas = document.createElement('canvas');
        canvas.classList.add('gptpdf-img-canvas');
        canvas.style.setProperty('display', 'none', 'important');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        img.setAttribute('data-gptpdf-img-src', canvas.toDataURL());
    }
}

function applyDataSrcBase(element) {
    const images = element.querySelectorAll('img[data-gptpdf-img-src]');

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const dataSrc = img.getAttribute('data-gptpdf-img-src');

        if (dataSrc) {
            img.setAttribute('src', dataSrc);
        }
    }
}

function prepareSelection(element) {
    addImgBase64Src(element);

    const selection = window.getSelection();
    if(!selection.isCollapsed) {
        const rangeCount = selection.rangeCount;
        if(rangeCount > 0) {
            const startElement = findRow(
                selection.getRangeAt(0).startContainer.parentElement);
            if(startElement && hasParent(startElement, element)) {
                // selection is in the main block
                const endElement = findRow(
                    selection.getRangeAt(
                        rangeCount-1).endContainer.parentElement);

                const newContainer = document.createElement('main');
                newContainer.classList.add('h-full', 'w-full');
                if(gptpdfIsPairTurn(startElement)) {
                    // Pair turns are not siblings: each sits in its own
                    // virtualizer slot, so nextElementSibling ends the walk
                    // after one turn. Take the range in document order.
                    const all = Array.from(
                        element.querySelectorAll('div[data-turn-key]'));
                    const from = all.indexOf(startElement);
                    let to = endElement ? all.indexOf(endElement) : -1;
                    if(to < from) {
                        to = all.length - 1;
                    }
                    for(let i = from; i <= to; i++) {
                        const child_clone = all[i].cloneNode(true);
                        newContainer.appendChild(child_clone);
                        persistCanvases(all[i], child_clone);
                    }
                    return newContainer;
                }
                let currentElement = startElement;
                while(currentElement) {
                    const child_clone = currentElement.cloneNode(true);
                    newContainer.appendChild(child_clone);
                    persistCanvases(currentElement, child_clone);
                    if(currentElement === endElement) {
                        break;
                    }
                    currentElement = currentElement.nextElementSibling;
                }
                return newContainer;
            }
        }
    }
    let element_clone = element.cloneNode(true);
    persistCanvases(element, element_clone);
    applyDataSrcBase(element_clone);

    if(element_clone.tagName.toLowerCase() !== 'main') {
        // add main element as it's not presented in a shared chat
        const main = document.createElement('main');
        main.classList.add('h-full', 'w-full');
        main.appendChild(element_clone);
        element_clone = main;
    }
    return element_clone;
}

function prepareContent(element) {
    element = prepareSelection(element);

    // fix nested buttons error
    element.querySelectorAll('button button').forEach(button => {
        button.parentNode.removeChild(button);
    });

    // remove scripts, styles, and unnecessary elements
    element.querySelectorAll(
        'script, style, .absolute.z-0, .absolute.z-1, #AIPRM__sidebar'
    ).forEach(el => el.remove());

    // Mark only truly failed (not converted to base64) grid images as expired
    element.querySelectorAll('.grid img').forEach(img => {
        if (!img.src.startsWith('data:')) {
            img.setAttribute(
                'alt', 'The image has expired. Refresh ChatGPT page and retry saving to PDF.');
        }
    });

    element.classList.add('chat-gpt-custom');

    return element;
}

function addPdfExtension(filename) {
    return filename.replace(/\.*$/, '') + '.pdf';
}

function parseRgbColor(color) {
    const match = String(color || '').match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
    if(!match) {
        return null;
    }
    const alpha = match[4] === undefined ? 1 : parseFloat(match[4]);
    if(alpha === 0) {
        return null;
    }
    return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
    };
}

function colorLuminance(color) {
    const rgb = parseRgbColor(color);
    if(!rgb) {
        return null;
    }
    return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

function isLight(body) {
    const docEl = document.documentElement;
    const docStyle = window.getComputedStyle(docEl);
    const bodyStyle = window.getComputedStyle(body || document.body);

    if(docEl.classList.contains('dark') ||
       docEl.style.colorScheme === 'dark' ||
       docStyle.colorScheme === 'dark' ||
       docEl.dataset.chatTheme === 'dark') {
        return false;
    }

    if(docEl.classList.contains('light') ||
       docEl.style.colorScheme === 'light' ||
       docStyle.colorScheme === 'light' ||
       docEl.dataset.chatTheme === 'light') {
        return true;
    }

    const luminance = colorLuminance(bodyStyle.backgroundColor) ??
          colorLuminance(docStyle.backgroundColor);
    return luminance === null ? true : luminance > 0.5;
}

function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return (
        style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0 &&
            style.opacity !== '0'
    );
}

function styleCanvasArea(element, stop_element) {
    while(element) {
        if(element == stop_element) {
            // canvas parent area not found
            return;
        }

        const style_height = element.style.height;
        if(style_height &&
           style_height !== 'auto' &&
           style_height !== 'initial') {
            element.style.height = '';
            return;
        }

        element = element.parentElement;
    }
}

function persistCanvases(orig_element, new_element) {
    const items = [];
    const orig_canvases = orig_element.querySelectorAll('canvas');
    const new_canvases = new_element.querySelectorAll('canvas');
    if(orig_canvases.length !== new_canvases.length) {
        return;
    }
    for(let i = 0; i < orig_canvases.length; i++) {
        const orig_canvas = orig_canvases[i];
        if(isElementVisible(orig_canvas)) {
            const new_canvas = new_canvases[i];
            const img = new_canvas.ownerDocument.createElement('img');
            img.src = orig_canvas.toDataURL();
            img.classList.add('gptpdf-canvas-img');
            new_canvas.parentNode.replaceChild(img, new_canvas);

            styleCanvasArea(img, new_element);
        }
    }
}

// ChatGPT's placeholder name for a chat it has not named yet, in the locales we
// have seen. Best-effort: missing one only costs a fallback we would take anyway.
const GENERIC_CHAT_TITLES = [
    'chatgpt', 'new chat', 'untitled',
    'новый чат', 'новий чат', 'nuevo chat', 'nouveau chat', 'neuer chat',
    'novo chat', 'nuova chat', 'nowy czat', 'nieuwe chat', 'yeni sohbet'
];

function isGenericChatTitle(t) {
    const s = (t || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return !s || GENERIC_CHAT_TITLES.indexOf(s) !== -1;
}

// Name taken from the first thing the user asked. Never generic, so two exports
// are never indistinguishable in the downloads folder. Reads `root` (the export
// clone, which holds the whole conversation) rather than the live page, where
// the first turn is usually unmounted by the time we get here.
function firstPromptTitle(root) {
    const first = (root || document).querySelector(
        '[data-message-author-role="user"], [data-user-message-bubble]');
    if(!first) {
        return '';
    }
    // textContent, not innerText: the clone is detached, so it has no layout.
    const text = (first.textContent || '').replace(/\s+/g, ' ').trim();
    if(!text) {
        return '';
    }
    return text.length > 60 ? text.slice(0, 60).trim() + '…' : text;
}

// Chat name for the PDF heading and file name, best source first.
function getTitle(root) {
    let title = '';
    // 1. The chat's own link in the sidebar — the freshest, always-correct name,
    //    and it carries no model name. This used to be matched as
    //    `nav a[href=...]`; since the 2026-07 ChatGPT redesign that finds
    //    nothing (verified 07-20), so search the whole document: the link may
    //    have moved out of <nav>, and the history list is virtualized, so on a
    //    long history it may not be mounted at all.
    const links = document.querySelectorAll(
        `a[href="${window.location.pathname}"]`);
    for(let i = 0; i < links.length && !title; i++) {
        title = links[i].textContent.trim();
    }
    // 2. Tab title — correct once ChatGPT refreshes it, but it lags on a
    //    freshly named chat and until then still reads as the generic
    //    "New chat". With (1) broken that lag is what made two different
    //    exports both land as "Новый чат" (user report 2026-07-20).
    if(!title) {
        const titles = document.getElementsByTagName('title');
        if(titles.length > 0) {
            title = titles[0].textContent.trim();
        }
        if(isGenericChatTitle(title)) {
            title = '';
        }
    }
    if(!title) {
        title = firstPromptTitle(root);
    }
    return title;
}

// ── All sources of a grouped citation ─────────────────────────────────────
//
// ChatGPT prints a grouped citation as one pill, "PubMed Central (PMC) +1":
// only the first source is in the page; the others live in its data and show
// in a hover card (08.10, the author: «там слито 2 ссылки — нужно достать
// все»). The data is the conversation the page itself loaded — on a chat
// page from /backend-api/conversation/{id} with the person's own session, on
// a shared page inline in its HTML. Read on Export only, never stored, never
// sent anywhere but into the PDF, as the links ChatGPT itself shows.
// Measured on the author's test chat (share 6ac75a91…, CHATGPT-DOM §11):
// message.metadata.content_references, type grouped_webpages; a pill per
// items[i]; its sources are [item, ...item.supporting_websites]; pills come
// in the order of the refs by start_idx.

// Which conversation the page shows: a chat, a shared copy, or none.
function gptpdfConversationRef(pathname) {
    const uuid = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';
    let m = new RegExp('^/share/' + uuid).exec(pathname || '');
    if(m) {
        return { kind: 'share', id: m[1] };
    }
    m = new RegExp('^(?:/g/[^/]+)?/c/' + uuid).exec(pathname || '');
    return m ? { kind: 'chat', id: m[1] } : null;
}

// React Router's turbo-stream, as a shared page carries its data: a flat
// array, objects as {"_<key index>": <value index>}, negative specials.
function gptpdfDecodeTurboStream(text) {
    const line = (text || '').split('\n').find(l => l.trim().startsWith('['));
    if(!line) {
        return null;
    }
    const values = JSON.parse(line);
    const memo = new Map();
    const special = { '-1': undefined, '-2': NaN, '-3': -Infinity, '-4': -0,
                      '-5': null, '-6': Infinity, '-7': undefined };
    const hyd = function(i) {
        if(typeof i === 'number' && i < 0) {
            return special[String(i)];
        }
        if(memo.has(i)) {
            return memo.get(i);
        }
        const v = values[i];
        let r = v;
        if(Array.isArray(v)) {
            if(v.length && typeof v[0] === 'string') {
                r = null;                   // a typed value (date, promise…): not needed
            } else {
                r = [];
                memo.set(i, r);
                v.forEach(x => r.push(hyd(x)));
            }
        } else if(v && typeof v === 'object') {
            r = {};
            memo.set(i, r);
            Object.keys(v).forEach(function(k) {
                const key = /^_\d+$/.test(k) ? values[+k.slice(1)] : k;
                r[key] = hyd(v[k]);
            });
        }
        memo.set(i, r);
        return r;
    };
    return hyd(0);
}

// A shared page: its data is inline, in streamController.enqueue("…") calls.
function gptpdfShareMapping(doc) {
    let text = '';
    Array.from(doc.querySelectorAll('script:not([src])')).forEach(function(s) {
        // Runs, not single characters: one loop step per character overflowed
        // the regex stack on a 10 MB payload (review 08.10).
        const re = /streamController\.enqueue\(("(?:[^"\\]+|\\.)*")\)/g;
        let m;
        while((m = re.exec(s.textContent || ''))) {
            text += JSON.parse(m[1]);
        }
    });
    const root = text && gptpdfDecodeTurboStream(text);
    const found = [];
    (function walk(o, depth) {
        if(!o || typeof o !== 'object' || depth > 8 || found.length) {
            return;
        }
        if(o.mapping && typeof o.mapping === 'object' && !Array.isArray(o.mapping)) {
            found.push(o.mapping);
            return;
        }
        Object.keys(o).forEach(k => walk(o[k], depth + 1));
    })(root, 0);
    return found[0] || null;
}

function gptpdfCookie(name) {
    const m = new RegExp('(?:^|; )' + name + '=([^;]*)').exec(document.cookie || '');
    return m ? decodeURIComponent(m[1]) : '';
}

// A chat page: the same request the page makes, with the person's session.
function gptpdfChatMapping(id, signal) {
    return fetch('/api/auth/session', { credentials: 'include', signal: signal })
        .then(r => r.ok ? r.json() : null)
        .then(function(session) {
            const token = session && session.accessToken;
            if(!token) {
                return null;
            }
            const headers = { 'Authorization': 'Bearer ' + token };
            const account = gptpdfCookie('_account');
            if(account && account !== 'personal') {
                headers['ChatGPT-Account-ID'] = account;
            }
            const device = gptpdfCookie('oai-did');
            if(device) {
                headers['OAI-Device-Id'] = device;
            }
            return fetch('/backend-api/conversation/' + id, {
                credentials: 'include', headers: headers, signal: signal
            }).then(r => r.ok ? r.json() : null);
        })
        .then(data => (data && data.mapping) || null);
}

// message id → its pills in page order, each with all its sources.
function gptpdfCitationIndex(mapping) {
    const index = new Map();
    const usable = (it) => it && it.url && !/^(file:|https?:\/\/localhost)/i.test(it.url);
    Object.keys(mapping || {}).forEach(function(k) {
        const msg = mapping[k] && mapping[k].message;
        const refs = msg && msg.metadata && msg.metadata.content_references;
        if(!msg || !msg.id || !Array.isArray(refs)) {
            return;
        }
        const pills = [];
        refs.filter(function(r) {
            return r && !r.invalid && r.style !== 'hidden' &&
                /^(grouped_webpages|webpage|webpage_extended)$/.test(r.type || '');
        }).sort(function(a, b) {
            return (a.start_idx - b.start_idx) || (a.end_idx - b.end_idx);
        }).forEach(function(r) {
            const items = r.type === 'grouped_webpages' ? (r.items || []) : [r];
            items.filter(usable).forEach(function(it) {
                pills.push({ url: it.url, start: r.start_idx,
                             sources: [it].concat((it.supporting_websites || []).filter(usable)) });
            });
        });
        if(pills.length) {
            index.set(msg.id, pills);
        }
    });
    return index;
}

// Rewrites the copy's pills and says so in one console line; never throws.
function gptpdfApplyCitationSources(root, index) {
    let n = 0;
    try {
        n = gptpdfRewriteCitationPills(root, index);
    } catch(e) {
        n = -1;
    }
    console.log('[gptpdf] citations: ' + (index ? index.size + ' messages with pills in the data, ' +
        (n < 0 ? 'REWRITE FAILED' : n + ' grouped pills given all their sources') :
        'no data (pills keep their first source)'));
}

// Started on Export, waited for at most `ms` later; never rejects — without
// the data the pills print as before, with their first source.
function gptpdfCitationSourcesStart(ms) {
    const ref = gptpdfConversationRef(location.pathname);
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let work;
    try {
        work = !ref ? Promise.resolve(null) :
            ref.kind === 'share' ? Promise.resolve(gptpdfShareMapping(document)) :
            gptpdfChatMapping(ref.id, ctl && ctl.signal);
    } catch(e) {
        work = Promise.resolve(null);
    }
    const done = work.then(m => m ? gptpdfCitationIndex(m) : null).catch(() => null);
    // Only a copy with a "+N" pill can use the data: any other export does
    // not wait for it (review 08.10).
    return function wait(root) {
        const grouped = root && Array.from(root.querySelectorAll(
            '[data-testid="webpage-citation-pill"]')).some(p => /\+\d+\s*$/.test(p.textContent));
        if(root && !grouped) {
            if(ctl) ctl.abort();
            return Promise.resolve(null);
        }
        return Promise.race([done, new Promise(function(r) {
            setTimeout(function() {
                if(ctl) ctl.abort();
                r(null);
            }, ms || 4000);
        })]);
    };
}
