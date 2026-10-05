chrome.runtime.setUninstallURL('https://panarini.github.io/ExportChatGPTConversation/uninstall.html');

chrome.runtime.onMessage.addListener(function(message) {
    if(message.action === 'ga4Event') {
        // Auto-detect dev build: an unpacked local copy reports installType
        // 'development' and is skipped, so testing never pollutes GA4. A copy
        // installed from the Web Store reports 'normal' and DOES count.
        // (getSelf needs no extra permission.)
        chrome.management.getSelf(function(self) {
            if(self.installType === 'development') return;
            chrome.storage.local.get(['ga4_client_id'], function(result) {
                let clientId = result.ga4_client_id;
                function doSend(cid) {
                    // Only attach params when the sender provided them, so the
                    // existing bare events stay byte-identical on the wire.
                    const evt = { name: message.eventName };
                    if(message.eventParams) {
                        evt.params = message.eventParams;
                    }
                    fetch('https://www.google-analytics.com/mp/collect?measurement_id=G-LVYMZZ18SD&api_secret=OEp4iQgzQHmFupGP91uz1g', {
                        method: 'POST',
                        body: JSON.stringify({
                            client_id: cid,
                            events: [evt]
                        })
                    }).catch(function() {});
                }
                if(clientId) {
                    doSend(clientId);
                } else {
                    clientId = 'ext_' + Math.random().toString(36).slice(2) + Date.now();
                    chrome.storage.local.set({ ga4_client_id: clientId }, function() { doSend(clientId); });
                }
            });
        });
    }
});

const GOTENBERG_URL = 'https://export-gpt.duckdns.org/forms/chromium/convert/html';
const sessions = {};

function blobToDataURL(blob, callback) {
    const reader = new FileReader();
    reader.onload = function(e) { callback(e.target.result); };
    reader.readAsDataURL(blob);
}

// Room the page-number footer needs at the bottom of the page, in inches.
const FOOTER_ROOM_IN = 0.35;

// The page-number footer Gotenberg prints on every page. Measured on our
// server 04.10: the template box starts at the top of the bottom margin, a
// percentage height does not resolve inside it, and a background on it spreads
// over the WHOLE page (a dark export came out as a blank dark sheet with only
// the number on it). So it carries no background, and the number is pushed
// down by the margin's own height — it lands about 0.25in above the page edge
// whatever the margin, clear of the last line of text.
function pageNumberFooter(bottomIn) {
    const drop = Math.max(0, bottomIn - 0.21).toFixed(2);
    return '<html><head><style>' +
        'html,body{margin:0;padding:0}' +
        '.n{box-sizing:border-box;width:100%;padding-top:' + drop + 'in;text-align:center;' +
        'font:9px/1 Helvetica,Arial,sans-serif;color:#999}' +
        '</style></head><body><div class="n"><span class="pageNumber"></span>' +
        '&nbsp;/&nbsp;<span class="totalPages"></span></div></body></html>';
}

function sendToGotenberg(htmlContent, params, sendResponse) {

    // Inject custom CSS
    if (params.custom_css) {
        htmlContent = htmlContent.replace('</head>', '<style>' + params.custom_css + '</style></head>');
    }

    // Fix images
    htmlContent = htmlContent.replace('</head>', '<style>img{max-width:100% !important}</style></head>');

    const isDark = !!params.page_background_color;
    const bg = isDark ? params.page_background_color : 'ffffff';

    function toInches(val) {
        if (!val && val !== 0) return '0.4';
        const s = String(val).trim();
        if (/^[0-9.]+$/.test(s)) return s;
        if (s.endsWith('px')) return String((parseFloat(s) / 96).toFixed(4));
        if (s.endsWith('cm')) return String((parseFloat(s) / 2.54).toFixed(4));
        if (s.endsWith('mm')) return String((parseFloat(s) / 25.4).toFixed(4));
        return String(parseFloat(s) || 0.4);
    }

    // Dark theme: @page paints the whole sheet, margins included, so a dark
    // page keeps the same margins as a light one — on every page, not just the
    // first. Until 1.1.11 dark pages had zero margins (Chromium leaves a margin
    // white) and the spacing was body padding, which only the first and last
    // page got; zero margins also left no room for the page-number footer.
    // Measured on our server 04.10: no white strip, text clear of the number.
    if (isDark) {
        htmlContent = htmlContent.replace('</head>',
            '<style>' +
            '@page{background:#' + bg + '}' +
            'html,body{background:#' + bg + ' !important;margin:0 !important}' +
            '</style></head>'
        );
    }

    const formData = new FormData();
    formData.append('files', new Blob([htmlContent], {type: 'text/html'}), 'index.html');

    // Paper size and orientation — both sides computed here, on purpose.
    //
    // Gotenberg's `landscape` flag is exactly a swap of paperWidth/paperHeight
    // (measured 08-22: 8.27x11.69 + landscape came back identical to a plain
    // 11.69x8.27). Harmless on its own — but single-page mode forces the height
    // to 200in to get one uncut page, and the flag swapped THAT: a single-page
    // landscape export came out 200in WIDE and 8.28in tall, the whole chat
    // squeezed into a five-metre strip. Deciding the two numbers ourselves keeps
    // orientation off the single-page height and drops the dependency on how
    // Chromium reads the flag.
    const isSinglePage = params.single_page || params.page_height === '-1';
    const isLandscape = params.orientation === 'landscape';
    const SINGLE_PAGE_HEIGHT = '200';
    const [shortSide, longSide] = params.page_size === 'letter'
        ? ['8.5', '11']       // US Letter
        : ['8.27', '11.69'];  // A4

    formData.append('paperWidth', isLandscape ? longSide : shortSide);
    formData.append('paperHeight', isSinglePage
        ? SINGLE_PAGE_HEIGHT                       // one long page, however wide
        : (isLandscape ? shortSide : longSide));

    // Margins
    let margins;
    if (params.no_margins) {
        margins = ['0.1', '0.1', '0.1', '0.1'];
    } else if (params.margin_left !== undefined) {
        margins = [toInches(params.margin_top), toInches(params.margin_bottom),
                   toInches(params.margin_left), toInches(params.margin_right)];
    } else {
        margins = ['0.4', '0.4', '0.4', '0.4'];
    }

    // Page numbers: Chromium prints footer.html into the bottom margin of every
    // page and fills in pageNumber / totalPages itself (measured on our server
    // 04.10). The footer needs room — a minimal bottom margin would cut it
    // off — so that margin is raised to fit it. A single long page has nothing
    // to number.
    if (params.page_numbers && !isSinglePage) {
        margins[1] = String(Math.max(parseFloat(margins[1]) || 0, FOOTER_ROOM_IN));
        formData.append('files',
            new Blob([pageNumberFooter(parseFloat(margins[1]))], {type: 'text/html'}),
            'footer.html');
    }
    formData.append('marginTop',    margins[0]);
    formData.append('marginBottom', margins[1]);
    formData.append('marginLeft',   margins[2]);
    formData.append('marginRight',  margins[3]);

    // Bookmarks: with the table of contents on, the PDF also gets an outline in
    // the viewer's side panel. Chromium builds it from headings, and only into
    // a tagged PDF — the outline flag alone gave none (measured 04.10). The
    // questions are marked as headings in render.js (gptpdfMarkOutline).
    if (params.outline) {
        formData.append('generateDocumentOutline', 'true');
        formData.append('generateTaggedPdf', 'true');
    }

    formData.append('printBackground', 'true');
    formData.append('scale', String(params.scale_factor ? params.scale_factor / 100 : 1));

    formData.append('waitDelay', '10s');

    fetch(GOTENBERG_URL, { method: 'POST', body: formData })
        .then(response => {
            if (response.status !== 200) {
                response.text().then(msg => sendResponse({ status: response.status, message: msg }));
            } else {
                response.blob().then(blob => {
                    blobToDataURL(blob, url => sendResponse({ status: 200, blob, url }));
                });
            }
        })
        .catch(error => sendResponse({ status: 'network-error', message: error.toString() }));
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.contentScriptQuery == 'uploadChunk') {
        const sid = request.sessionId;
        if (!sessions[sid]) {
            const now = Date.now();
            for (let id in sessions) {
                if (now - sessions[id].createdAt > 600000) delete sessions[id];
            }
            sessions[sid] = { chunks: new Array(request.totalChunks), receivedChunks: 0, createdAt: now };
        }
        sessions[sid].chunks[request.chunkIndex] = request.chunkData;
        sessions[sid].receivedChunks++;
        sendResponse({ success: true });
        return true;
    }

    if (request.contentScriptQuery == 'processData') {
        const session = sessions[request.sessionId];
        if (!session) { sendResponse({ status: 'error', message: 'Session not found' }); return true; }
        const htmlContent = session.chunks.join('');
        delete sessions[request.sessionId];
        sendToGotenberg(htmlContent, request.params, sendResponse);
        return true;
    }
});
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'fetchImageAsBase64') {
        const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 5000)
                );
                Promise.race([
                    fetch(message.src, {
                        credentials: 'include',
                        headers: {
                            'Referer': 'https://chatgpt.com/',
                            'Origin': 'https://chatgpt.com'
                        }
                    }),
                    timeoutPromise
                ])
                    .then(r => r.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onload = () => sendResponse({ data: reader.result });
                        reader.readAsDataURL(blob);
                    })
                    .catch((e) => {
                        sendResponse({ data: null });
                    });
        return true;
    }
});

chrome.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
    if (message.action === 'openChatGPT') {
        chrome.storage.local.set({ gptpdfHighlightBtn: true }, function() {
            chrome.tabs.query({ url: ['*://chatgpt.com/*', '*://chat.com/*'] }, function(tabs) {
                if (!tabs || tabs.length === 0) {
                    chrome.tabs.create({ url: 'https://chatgpt.com' });
                } else {
                    const conv = tabs.find(t => t.url && /chatgpt\.com\/c\//.test(t.url));
                    const target = conv || tabs[0];
                    chrome.tabs.update(target.id, { active: true }, () => chrome.tabs.reload(target.id));
                }
                sendResponse({ ok: true });
            });
        });
        return true;
    }
});

chrome.action.onClicked.addListener(function() {
    chrome.storage.local.set({ gptpdfHighlightBtn: true }, function() {
        chrome.tabs.query({ url: ['*://chatgpt.com/*', '*://chat.com/*'] }, function(tabs) {
            if (!tabs || tabs.length === 0) { chrome.tabs.create({ url: 'https://chatgpt.com' }); return; }
            const conv = tabs.find(t => t.url && /chatgpt\.com\/c\//.test(t.url));
            const target = conv || tabs[0];
            chrome.tabs.update(target.id, { active: true }, () => chrome.tabs.reload(target.id));
        });
    });
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.storage.local.set({ gptpdfHighlightBtn: true });
        chrome.tabs.create({ url: 'https://panarini.github.io/ExportChatGPTConversation/' });
    }
    // Settings: nothing is written here, on install or on update. The one set
    // of defaults lives in shared.js and getOptions lays a person's saved values
    // over it, so a key someone never set reads the default, and a value they
    // chose is never touched. Until 1.1.11 the install wrote its own defaults
    // (date and source link on, unlike Reset to defaults), and until 1.1.10
    // every update switched the TOC, date and source link back on for anyone
    // who had turned them off (tests/settings-update-test.js).
});
