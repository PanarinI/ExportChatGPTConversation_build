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

    // Calculate padding values from settings
    let pt, pb, pl, pr;
    if (params.no_margins) {
        pt = pb = pl = pr = '0.1in';
    } else if (params.margin_left !== undefined) {
        pt = toInches(params.margin_top)    + 'in';
        pb = toInches(params.margin_bottom) + 'in';
        pl = toInches(params.margin_left)   + 'in';
        pr = toInches(params.margin_right)  + 'in';
    } else {
        pt = pb = pl = pr = '0.4in';
    }

    // Dark mode: set background + use CSS padding instead of Gotenberg margins
    if (isDark) {
        let dp;
        if (params.no_margins) {
            dp = '0.1in';
        } else if (params.margin_left !== undefined) {
            const t = toInches(params.margin_top)    || '0.4';
            const b = toInches(params.margin_bottom) || '0.4';
            const l = toInches(params.margin_left)   || '0.4';
            const r = toInches(params.margin_right)  || '0.4';
            dp = t + 'in ' + r + 'in ' + b + 'in ' + l + 'in';
        } else {
            dp = '0.4in';
        }
        htmlContent = htmlContent.replace('</head>',
            '<style>' +
            'html,body{background:#' + bg + ' !important;margin:0 !important}' +
            'body{padding:' + dp + ' !important;box-sizing:border-box !important}' +
            '</style></head>'
        );
    }

    const formData = new FormData();
    formData.append('files', new Blob([htmlContent], {type: 'text/html'}), 'index.html');

    // Paper size
    const isSinglePage = params.single_page || params.page_height === '-1';
    if (params.page_size === 'letter') {
        formData.append('paperWidth', '8.5');
        formData.append('paperHeight', isSinglePage ? '200' : '11');
    } else if (params.page_size === 'a5') {
        formData.append('paperWidth', '5.83');
        formData.append('paperHeight', isSinglePage ? '200' : '8.27');
    } else {
        formData.append('paperWidth', '8.27');
        formData.append('paperHeight', isSinglePage ? '200' : '11.69');
    }

    // Orientation
    if (params.orientation === 'landscape') {
        formData.append('landscape', 'true');
    }

    // Margins
    if (isDark) {
        // Dark mode: always zero Gotenberg margins, CSS padding handles spacing
        formData.append('marginTop',    '0');
        formData.append('marginBottom', '0');
        formData.append('marginLeft',   '0');
        formData.append('marginRight',  '0');
    } else if (params.no_margins) {
        formData.append('marginTop',    '0.1');
        formData.append('marginBottom', '0.1');
        formData.append('marginLeft',   '0.1');
        formData.append('marginRight',  '0.1');
    } else if (params.margin_left !== undefined) {
        formData.append('marginTop',    toInches(params.margin_top));
        formData.append('marginBottom', toInches(params.margin_bottom));
        formData.append('marginLeft',   toInches(params.margin_left));
        formData.append('marginRight',  toInches(params.margin_right));
    } else {
        formData.append('marginTop',    '0.4');
        formData.append('marginBottom', '0.4');
        formData.append('marginLeft',   '0.4');
        formData.append('marginRight',  '0.4');
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
    if (details.reason === 'install') {
        chrome.storage.sync.set({ options: {
            margins: '', theme: '', zoom: 100, no_questions: false,
            q_color: 'default', q_color_picker: '#ecf9f2',
            q_fg_color: 'default', q_fg_color_picker: '#000',
            title_mode: '', margin_left: '0.4in', margin_right: '0.4in',
            margin_top: '0.4in', margin_bottom: '0.4in', page_break: '',
            toc: 'basic', no_icons: true, model_name: false, source_link: true,
            datetime_format: 'date_only', single_page: false, q_align: 'right', q_rounded: true
        }});
    }
    if (details.reason === 'update' || details.reason === 'install') {
        chrome.storage.sync.get('options', function(data) {
            const opts = data.options;
            if (!opts) return;
            const updated = Object.assign({}, opts);
            let changed = false;
            if (!opts.toc) { updated.toc = 'basic'; changed = true; }
            if (!opts.source_link) { updated.source_link = true; changed = true; }
            if (!opts.datetime_format || opts.datetime_format === 'none') { updated.datetime_format = 'date_only'; changed = true; }
            if (opts.single_page === undefined) { updated.single_page = false; changed = true; }
            if (changed) chrome.storage.sync.set({ options: updated });
        });
    }
});