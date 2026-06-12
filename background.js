const sessions = {};

function blobToDataURL(blob, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        callback(e.target.result);
    };
    reader.readAsDataURL(blob);
}

function handleAPIResponse(response, sendResponse) {
    if(response.status != 200) {
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
}

function tryCompress(htmlContent) {
    return new Promise((resolve, reject) => {
        if(typeof CompressionStream === 'undefined') {
            reject(new Error('CompressionStream not available'));
            return;
        }

        try {
            const encoder = new TextEncoder();
            const htmlBytes = encoder.encode(htmlContent);

            const stream = new Blob([htmlBytes])
                .stream()
                .pipeThrough(new CompressionStream('gzip'));

            new Response(stream).arrayBuffer()
                .then(gzippedData => {
                    const gzipped = new Uint8Array(gzippedData);
                    const gzipBlob = new Blob(
                        [gzipped],
                        {type: 'application/gzip'}
                    );
                    resolve({
                        blob: gzipBlob,
                        filename: 'index.html.gz'
                    });
                })
                .catch(reject);
        } catch(error) {
            reject(error);
        }
    });
}

function prepareFile(htmlContent) {
    return tryCompress(htmlContent)
        .then(result => result)
        .catch(error => {
            const htmlBlob = new Blob([htmlContent], {type: 'text/html'});
            return {
                blob: htmlBlob,
                filename: 'index.html'
            };
        });
}

function sendToAPI(fileData, request, sendResponse) {
    const formData = new FormData();

    for(let key in request.params) {
        formData.append(key, request.params[key]);
    }
    formData.append('file', fileData.blob, fileData.filename);

    fetch(request.url, {
        method: 'POST',
        body: formData,
        responseType: 'blob',
        headers: {
            'Authorization': 'Basic ' + btoa(
                request.username + ':' + request.apiKey
            )
        }
    }).then(response => {
        handleAPIResponse(response, sendResponse);
    }).catch(error => {
        sendResponse({
            status: error.status || 'network-error',
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

            prepareFile(htmlContent)
                .then(fileData => {
                    sendToAPI(fileData, request, sendResponse);
                })
                .catch(error => {
                    sendResponse({
                        status: 'error',
                        message: error.toString()
                    });
                });

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
            });
        });
        sendResponse({ok: true});
    }
});

// Clicking the extension icon navigates to ChatGPT and triggers the ripple animation
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
        // Set highlight flag immediately so animation plays when user opens ChatGPT
        chrome.storage.local.set({pdfcrowdHighlightBtn: true});
        // Open the welcome page (GitHub Pages standalone)
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
        // Migrate settings: apply new defaults only if user still had old values
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
            // single_page was moved from menu to settings — default is off
            if(opts.single_page === undefined) {
                updated.single_page = false; changed = true;
            }

            if(changed) chrome.storage.sync.set({options: updated});
        });
    }
});