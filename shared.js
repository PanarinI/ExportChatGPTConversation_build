'use strict';

const gptpdfShared = {};

gptpdfShared.defaultOptions = {
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

gptpdfShared.version = 'v3.9';
gptpdfShared.IS_DEV = false; // set to true in dev to suppress GA4 events

gptpdfShared.rateUsLink = '#';
// For 1–3 stars: redirect to private feedback form instead of public CWS review
gptpdfShared.feedbackFormLink = 'https://forms.gle/tXvfsrDsYbMprwiR7';
gptpdfShared.hasOptions = true;
if (typeof GM_info !== 'undefined') {
    gptpdfShared.rateUsLink = 'https://greasyfork.org/en/scripts/484463-save-chatgpt-as-pdf/feedback#post-discussion';
    gptpdfShared.hasOptions = false;
} else if (navigator.userAgent.includes('Edg/')) {
    gptpdfShared.rateUsLink = 'https://microsoftedge.microsoft.com/addons/detail/save-chatgpt-as-pdf/fjlfcopnobjbkjiclieaopipchijelmj';
} else if (navigator.userAgent.includes("Chrome")) {
    gptpdfShared.rateUsLink = 'https://chromewebstore.google.com/detail/aighdeikamhkemngfanhnamdlpoceimo/reviews';
} else if (navigator.userAgent.includes("Firefox")) {
    gptpdfShared.rateUsLink = 'https://addons.mozilla.org/en-US/firefox/addon/save-chatgpt-as-pdf/reviews/';
}

gptpdfShared.getOptions = function(callback) {
    if(typeof chrome === 'undefined') {
        callback(gptpdfShared.defaultOptions);
    } else {
        try {
            chrome.storage.sync.get('options', function(obj) {
                let rv = {};
                Object.assign(rv, gptpdfShared.defaultOptions);
                if(obj.options) {
                    Object.assign(rv, obj.options);
                }
                callback(rv);
            });
        } catch(error) {
            console.error(error);
            callback(gptpdfShared.defaultOptions);
        }
    }
}
