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

pdfcrowdShared.helpContent = `
<div class="pdfcrowd-help-content">
<div class="pdfcrowd-category-title">
    Support
</div>

<div style="line-height:1.5">
    Feel free to contact us with any questions or for assistance. We're always happy to help!
    <br>
    Email us at <strong>panarin2005@gmail.com</strong>.
    <br>
    <span class="popup-hidden">
    Please <a href="${pdfcrowdShared.rateUsLink}">rate us</a> if you like the extension. It helps a lot!
    </span>
</div>

<div class="pdfcrowd-category">
  <div class="pdfcrowd-category-title">
    Note
  </div>
  <div>
    All generated PDFs include a banner which cannot be removed.
    <br>
    This is a limitation of the free conversion tier.
  </div>
</div>


<div class="pdfcrowd-category">
    <div class="pdfcrowd-category-title">
        Tips
    </div>
    <ul>
        <li>
            You can download a specific part of the chat by selecting it.
        </li>
        <li>
            If images are missing in the PDF, reload the page and try downloading the PDF again.
        </li>
        <li>
            Customize the PDF file via addon
            <a class="options-link">options</a>.
        </li>
    </ul>
</div>

<div class="pdfcrowd-category">
    <div class="pdfcrowd-category-title">
        Links
    </div>
    <ul>
        <li>
            <a href="https://panarini.github.io/ExportChatGPTConversation/" target="_blank">Export ChatGPT Conversation homepage</a>
        </li>
    </ul>
</div>
</div>
`;

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

function init() {
    let elem = document.getElementById('version');
    if(elem) {
        elem.innerHTML = pdfcrowdShared.version;
    }

    elem = document.getElementById('help');
    if(elem) {
        elem.innerHTML = pdfcrowdShared.helpContent;
    }
}

document.addEventListener('DOMContentLoaded', init);
