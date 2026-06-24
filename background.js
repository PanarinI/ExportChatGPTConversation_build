// Show uninstall feedback page when user removes the extension
chrome.runtime.setUninstallURL('https://panarini.github.io/ExportChatGPTConversation/uninstall.html');

// ── GA4 Measurement Protocol ──────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(function(message) {
    if(message.action === 'ga4Event') {
        fetch('https://www.google-analytics.com/mp/collect?measurement_id=G-LVYMZZ18SD&api_secret=OEp4iQgzQHmFupGP91uz1g', {
            method: 'POST',
            body: JSON.stringify({
                client_id: 'extension_' + Math.random().toString(36).slice(2),
                events: [{ name: message.eventName }]
            })
        }).catch(function() {});
    }
});

// ── Gotenberg config ──────────────────────────────────────────────────────────
const GOTENBERG_URL = 'http://89.167.13.19:3000/forms/chromium/convert/html';

const sessions = {};

function blobToDataURL(blob, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        callback(e.target.result);
    };
    reader.readAsDataURL(blob);
}

function sendToGotenberg(htmlContent, params, sendResponse) {
    // Inject custom_css into HTML <head> before sending to Gotenberg
    if (params.custom_css) {
        const css = typeof params.custom_css === 'string'
            ? params.custom_css
            : params.custom_css;
        const styleTag = '<style>' + css + '</style>';
        htmlContent = htmlContent.replace('</head>', styleTag + '</head>');
    }

    // Inject background color for dark mode
    if (params.page_background_color) {
        const bgStyle = '<style>html,body{background:#' + params.page_background_color + ' !important}</style>';
        htmlContent = htmlContent.replace('</head>', bgStyle + '</head>');
    }

    const formData = new FormData();

    // Gotenberg requires the HTML file to be named index.html
    const htmlBlob = new Blob([htmlContent], {type: 'text/html'});
    formData.append('files', htmlBlob, 'index.html');

    // Paper size
    if (params.page_size === 'letter') {
        formData.append('paperWidth', '8.5');
        formData.append('paperHeight', '11');
    } else {
        // A4 default
        formData.append('paperWidth', '8.27');
        formData.append('paperHeight', '11.69');
    }

    // Convert any unit to inches
    function toInches(val) {
        if (!val) return '0.4';
        const s = String(val).trim();
        if (s.endsWith('px')) return String((parseFloat(s) / 96).toFixed(4));
        if (s.endsWith('cm')) return String((parseFloat(s) / 2.54).toFixed(4));
        if (s.endsWith('mm')) return String((parseFloat(s) / 25.4).toFixed(4));
        if (s.endsWith('in')) return String(parseFloat(s));
        return String(parseFloat(s) || 0.4);
    }

    formData.append('marginTop',    toInches(params.margin_top    || '0.4in'));
    formData.append('marginBottom', toInches(params.margin_bottom || '0.4in'));
    formData.append('marginLeft',   toInches(params.margin_left   || '0.4in'));
    formData.append('marginRight',  toInches(params.margin_right  || '0.4in'));

    // Single page — very tall paper
    if (params.single_page) {
        formData.append('paperHeight', '200');
    }

    // Print background colors
    formData.append('printBackground', 'true');

    // Scale — PDFCrowd uses scale_factor (100 = 100%), Gotenberg uses scale (1.0 = 100%)
    const scale = params.scale_factor || params.zoom || 100;
    formData.append('scale', String(scale / 100));

    fetch(GOTENBERG_URL, {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.status !== 200) {
            response.text().then(errorMessage => {
                sendResponse({
                    status: response.status,
                    message: errorMessage
                });
            });
        } else {
            response.blob().then(blob => {
                blobToDataURL(blob, url => {
                    sendResponse({
                        status: 200,
                        blob: blob,
                        url: url
                    });
                });
            });
        }
    }).catch(error => {
        sendResponse({
            status: 'network-error',
            message: error.toString()
        });
    });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if(request.contentScriptQuery == 'uploadChunk') {
            const sessionId = request.sessionId;

            if(!sessions[sessionId]) {
                const now = Date.now();
                const SESSION_TIMEOUT = 10 * 60 * 1000;

                for(let id in sessions) {
                    if(now - sessions[id].createdAt > SESSION_TIMEOUT) {
                        delete sessions[id];
                    }
                }

                sessions[sessionId] = {
                    chunks: new Array(request.totalChunks),
                    receivedChunks: 0,
                    createdAt: now
                };
            }

            sessions[sessionId].chunks[request.chunkIndex] = request.chunkData;
            sessions[sessionId].receivedChunks++;

            sendResponse({success: true});
            return true;
        }

        if(request.contentScriptQuery == 'processData') {
            const sessionId = request.sessionId;
            const session = sessions[sessionId];

            if(!session) {
                sendResponse({
                    status: 'error',
                    message: 'Session not found'
                });
                return true;
            }

            const htmlContent = session.chunks.join('');
            delete sessions[sessionId];

            sendToGotenberg(htmlContent, request.params, sendResponse);

            return true;
        }
    }
);

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "open_options_page") {
        chrome.runtime.openOptionsPage();
    }
});

// External message from GitHub Pages welcome page
chrome.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
    if (message.action === 'openChatGPT') {
        chrome.storage.local.set({pdfcrowdHighlightBtn: true}, function() {
            chrome.tabs.query({url: ['*://chatgpt.com/*', '*://chat.com/*']}, function(tabs) {
                if (!tabs || tabs.length === 0) {
                    chrome.tabs.create({url: 'https://chatgpt.com'});
                } else {
                    var conv = tabs.find(function(t) {
                        return t.url && /chatgpt\.com\/c\//.test(t.url);
                    });
                    var target = conv || tabs[0];
                    chrome.tabs.update(target.id, {active: true}, function() {
                        chrome.tabs.reload(target.id);
                    });
                }
                sendResponse({ok: true});
            });
        });
        return true;
    }
});

// Clicking the extension icon navigates to ChatGPT
chrome.action.onClicked.addListener(function() {
    chrome.storage.local.set({pdfcrowdHighlightBtn: true}, function() {
        chrome.tabs.query({url: ['*://chatgpt.com/*', '*://chat.com/*']}, function(tabs) {
            if (!tabs || tabs.length === 0) {
                chrome.tabs.create({url: 'https://chatgpt.com'});
                return;
            }
            const conversationTab = tabs.find(function(t) {
                return t.url && /chatgpt\.com\/c\//.test(t.url);
            });
            const target = conversationTab || tabs[0];
            chrome.tabs.update(target.id, {active: true}, function() {
                chrome.tabs.reload(target.id);
            });
        });
    });
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.storage.local.set({pdfcrowdHighlightBtn: true});
        chrome.tabs.create({
            url: 'https://panarini.github.io/ExportChatGPTConversation/'
        });
    }
    if (details.reason === 'install') {
        const newUserDefaults = {
            margins: '',
            theme: '',
            zoom: 100,
            no_questions: false,
            q_color: 'default',
            q_color_picker: '#ecf9f2',
            q_fg_color: 'default',
            q_fg_color_picker: '#000',
            title_mode: '',
            margin_left: '0.4in',
            margin_right: '0.4in',
            margin_top: '0.4in',
            margin_bottom: '0.4in',
            page_break: '',
            toc: 'basic',
            no_icons: true,
            model_name: false,
            source_link: true,
            datetime_format: 'date_only',
            single_page: false,
            q_align: 'right',
            q_rounded: true
        };
        chrome.storage.sync.set({options: newUserDefaults});
    }

    if (details.reason === 'update' || details.reason === 'install') {
        chrome.storage.sync.get('options', function(data) {
            const opts = data.options;
            if(!opts) return;
            const updated = Object.assign({}, opts);
            let changed = false;

            if(opts.toc === '' || opts.toc === undefined) {
                updated.toc = 'basic'; changed = true;
            }
            if(opts.source_link === false || opts.source_link === undefined) {
                updated.source_link = true; changed = true;
            }
            if(opts.datetime_format === 'none' || opts.datetime_format === undefined) {
                updated.datetime_format = 'date_only'; changed = true;
            }
            if(opts.single_page === undefined) {
                updated.single_page = false; changed = true;
            }

            if(changed) chrome.storage.sync.set({options: updated});
        });
    }
});