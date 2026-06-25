'use strict';

// Standalone DOM / utility helpers — pure-ish: take inputs, use only DOM/window
// and each other, never init() state. Extracted from common.js; shared globally
// across the content scripts (loaded before common.js).

function findRow(element) {
    return element.closest(
        'section[data-testid^="conversation-turn"]'
    ) || element.closest('article');
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
            img.hasAttribute('data-pdfcrowd-img-src')) {
            continue;
        }

        // Skip if image is not yet loaded
        if (!img.complete || img.naturalWidth === 0) {
            continue;
        }

        const canvas = document.createElement('canvas');
        canvas.classList.add('pdfcrowd-img-canvas');
        canvas.style.setProperty('display', 'none', 'important');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        img.setAttribute('data-pdfcrowd-img-src', canvas.toDataURL());
    }
}

function applyDataSrcBase(element) {
    const images = element.querySelectorAll('img[data-pdfcrowd-img-src]');

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const dataSrc = img.getAttribute('data-pdfcrowd-img-src');

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
            img.classList.add('pdfcrowd-canvas-img');
            new_canvas.parentNode.replaceChild(img, new_canvas);

            styleCanvasArea(img, new_element);
        }
    }
}

function getTitle() {
    let title = '';
    const chatTitle = document.querySelector(
        `nav a[href="${window.location.pathname}"]`);
    if(chatTitle) {
        // use chat title 1st as it does not contain model name in it
        title = chatTitle.textContent.trim();
    }
    if(!title) {
        const titles = document.getElementsByTagName('title');
        if(titles.length > 0) {
            title = titles[0].textContent.trim();
        }
    }
    return title;
}
