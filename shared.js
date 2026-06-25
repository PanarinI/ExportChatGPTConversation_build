'use strict';

const pdfcrowdShared = {};

pdfcrowdShared.defaultOptions = {
    margins: '',
    theme: '',
    zoom: 100,
    no_questions: false,
    q_color: 'default',
    q_color_picker: '#f0f4f8',
    q_fg_color: 'default',
    q_fg_color_picker: '#000000',
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
    q_align: 'right',
    q_rounded: true,
    page_size: 'a4',
    orientation: '',
    single_page: false
}

pdfcrowdShared.version = 'v3.9';

pdfcrowdShared.rateUsLink = '#';
// For 1–3 stars: redirect to private feedback form instead of public CWS review
pdfcrowdShared.feedbackFormLink = 'https://forms.gle/tXvfsrDsYbMprwiR7';
pdfcrowdShared.hasOptions = true;
if (typeof GM_info !== 'undefined') {
    pdfcrowdShared.rateUsLink = 'https://greasyfork.org/en/scripts/484463-save-chatgpt-as-pdf/feedback#post-discussion';
    pdfcrowdShared.hasOptions = false;
} else if (navigator.userAgent.includes('Edg/')) {
    pdfcrowdShared.rateUsLink = 'https://microsoftedge.microsoft.com/addons/detail/save-chatgpt-as-pdf/fjlfcopnobjbkjiclieaopipchijelmj';
} else if (navigator.userAgent.includes("Chrome")) {
    pdfcrowdShared.rateUsLink = 'https://chromewebstore.google.com/detail/aighdeikamhkemngfanhnamdlpoceimo/reviews';
} else if (navigator.userAgent.includes("Firefox")) {
    pdfcrowdShared.rateUsLink = 'https://addons.mozilla.org/en-US/firefox/addon/save-chatgpt-as-pdf/reviews/';
}

pdfcrowdShared.getOptions = function(callback) {
    if(typeof chrome === 'undefined') {
        callback(pdfcrowdShared.defaultOptions);
    } else {
        try {
            chrome.storage.sync.get('options', function(obj) {
                let rv = {};
                Object.assign(rv, pdfcrowdShared.defaultOptions);
                if(obj.options) {
                    Object.assign(rv, obj.options);
                }
                callback(rv);
            });
        } catch(error) {
            console.error(error);
            callback(pdfcrowdShared.defaultOptions);
        }
    }
}
