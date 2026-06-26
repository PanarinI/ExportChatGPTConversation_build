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

gptpdfChatGPT.doRequest = function(
    htmlContent,
    params,
    fileName,
    fnCleanup
) {
    gptpdfChatGPT.sendChunkedData(
        htmlContent,
        params,
        fileName,
        fnCleanup
    );
};

gptpdfChatGPT.init();
