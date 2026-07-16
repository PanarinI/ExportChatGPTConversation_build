gptpdfChatGPT.CHUNK_SIZE = 10 * 1024 * 1024;

gptpdfChatGPT.sendChunkedData = function(
    htmlContent,
    params,
    fileName,
    fnCleanup
) {
    const sessionId = 'session_' + Date.now() + '_' + Math.random();
    const chunks = [];
    const chunkSize = gptpdfChatGPT.CHUNK_SIZE;

    for (let i = 0; i < htmlContent.length; i += chunkSize) {
        chunks.push(htmlContent.substring(i, i + chunkSize));
    }

    const totalChunks = chunks.length;
    let currentChunk = 0;

    const sendNextChunk = function() {
        if (!chrome.runtime?.id) {
            fnCleanup();
            gptpdfChatGPT.showError(
                null,
                "Extension was updated. Please refresh the page."
            );
            return;
        }

        if (currentChunk >= totalChunks) {
            chrome.runtime.sendMessage({
                contentScriptQuery: 'processData',
                sessionId: sessionId,
                params: params,
                fileName: fileName
            }, response => {
                fnCleanup();
                if (response.status != 200) {
                    gptpdfChatGPT.showError(
                        response.status,
                        response.message
                    );
                } else {
                    gptpdfChatGPT.saveBlob(response.url, fileName);
                }
            });
            return;
        }

        chrome.runtime.sendMessage({
            contentScriptQuery: 'uploadChunk',
            sessionId: sessionId,
            chunkIndex: currentChunk,
            totalChunks: totalChunks,
            chunkData: chunks[currentChunk]
        }, response => {
            if (response && response.success) {
                currentChunk++;
                sendNextChunk();
            } else {
                fnCleanup();
                gptpdfChatGPT.showError(
                    null,
                    "Failed to upload chunk " + currentChunk +
                    `<br><small>${response.error}</small>`
                );
            }
        });
    };

    try {
        sendNextChunk();
    } catch(error) {
        fnCleanup();
        gptpdfChatGPT.showError(
            null,
            "Failed to send data: " +
            `<br><small>${error}</small>`
        );
    }
};

// ── Image shrink layer (heavy-export fix) ──────────────────────────────
// Runs once on the final HTML string, right before the chunked send — the
// single choke point both export paths (common.js / blockmode.js) go through,
// so the fragile DALL-E/harvest orchestration upstream stays untouched.
// Oversized raster images are downscaled; opaque ones re-encoded as JPEG.
// Images with transparency stay PNG. A result is only used when it is
// strictly smaller than the original — never inflate, never break an image.
gptpdfChatGPT.SHRINK_MAX_SIDE = 1600;      // px, longest side after downscale
gptpdfChatGPT.SHRINK_JPEG_QUALITY = 0.82;
gptpdfChatGPT.SHRINK_MIN_CHARS = 70000;    // ~50 KB decoded — smaller isn't worth touching

gptpdfChatGPT.shrinkHtmlImages = function(htmlContent) {
    if (htmlContent.indexOf('data:image/') === -1) {
        return Promise.resolve(htmlContent);
    }
    let doc;
    try {
        doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    } catch (e) {
        return Promise.resolve(htmlContent);
    }
    const candidates = [];
    doc.querySelectorAll('img').forEach(function(img) {
        const src = img.getAttribute('src') || '';
        if (!src.startsWith('data:image/')) return;
        // gif (animation) and svg (vector, tiny) are not worth re-encoding
        if (src.startsWith('data:image/gif') || src.startsWith('data:image/svg')) return;
        if (src.length < gptpdfChatGPT.SHRINK_MIN_CHARS) return;
        candidates.push(img);
    });
    if (!candidates.length) {
        return Promise.resolve(htmlContent);
    }

    function shrinkOne(img) {
        return new Promise(function(resolve) {
            const src = img.getAttribute('src');
            const isJpegSource = src.startsWith('data:image/jpeg') ||
                  src.startsWith('data:image/jpg');
            const el = new Image();
            el.onload = function() {
                try {
                    const w = el.naturalWidth, h = el.naturalHeight;
                    if (!w || !h) { resolve(); return; }
                    const scale = Math.min(
                        1, gptpdfChatGPT.SHRINK_MAX_SIDE / Math.max(w, h));
                    // jpeg already at target size: recompressing only loses quality
                    if (scale === 1 && isJpegSource) { resolve(); return; }
                    const cw = Math.max(1, Math.round(w * scale));
                    const ch = Math.max(1, Math.round(h * scale));
                    const canvas = document.createElement('canvas');
                    canvas.width = cw;
                    canvas.height = ch;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(el, 0, 0, cw, ch);
                    // Stride-sampled alpha scan: any transparency → keep PNG
                    let hasAlpha = false;
                    const px = ctx.getImageData(0, 0, cw, ch).data;
                    for (let i = 3; i < px.length; i += 64) {
                        if (px[i] < 250) { hasAlpha = true; break; }
                    }
                    let out;
                    if (hasAlpha) {
                        out = canvas.toDataURL('image/png');
                    } else {
                        // JPEG can't hold alpha — flatten onto white, not black
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, cw, ch);
                        out = canvas.toDataURL(
                            'image/jpeg', gptpdfChatGPT.SHRINK_JPEG_QUALITY);
                    }
                    if (out && out.length < src.length) {
                        img.setAttribute('src', out);
                    }
                } catch (e) {
                    // keep original image
                }
                resolve();
            };
            el.onerror = function() { resolve(); };
            el.src = src;
        });
    }

    // Sequential on purpose: one decoded image + one canvas in memory at a
    // time — the whole point is surviving image-heavy giants.
    let chain = Promise.resolve();
    candidates.forEach(function(img) {
        chain = chain.then(function() { return shrinkOne(img); });
    });
    return chain.then(function() {
        const doctype = htmlContent.match(/^\s*<!doctype[^>]*>/i);
        return (doctype ? doctype[0] : '') + doc.documentElement.outerHTML;
    }).catch(function() {
        return htmlContent;
    });
};

gptpdfChatGPT.doRequest = function(
    htmlContent,
    params,
    fileName,
    fnCleanup
) {
    // [gptpdf][measure] ВРЕМЕННО — замер до/после. УДАЛИТЬ перед сборкой билда.
    const gptpdfBeforeMB = (htmlContent.length / 1048576).toFixed(1);
    gptpdfChatGPT.shrinkHtmlImages(htmlContent).then(function(shrunk) {
        const gptpdfAfterMB = (shrunk.length / 1048576).toFixed(1);
        console.log('[gptpdf][measure] payload', gptpdfBeforeMB, 'MB →', gptpdfAfterMB, 'MB');
        alert('[gptpdf замер] payload = ' + gptpdfBeforeMB + ' MB → ' + gptpdfAfterMB + ' MB');
        gptpdfChatGPT.sendChunkedData(
            shrunk,
            params,
            fileName,
            fnCleanup
        );
    });
};

gptpdfChatGPT.init();
