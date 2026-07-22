'use strict';

// Standalone DOM / utility helpers — pure-ish: take inputs, use only DOM/window
// and each other, never init() state. Extracted from common.js; shared globally
// across the content scripts (loaded before common.js).

function findRow(element) {
    return element.closest(
        'section[data-testid^="conversation-turn"]'
    ) || element.closest('article');
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
        '[data-message-author-role="user"]');
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
