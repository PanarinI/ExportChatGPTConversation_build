'use strict';

const gptpdfShared = {};

// Paper size default. Letter (8.5x11in) is the office standard in the US,
// Canada, Mexico, the Philippines and a few more; A4 (210x297mm) is the
// standard everywhere else, and A4 printed on a Letter tray gets scaled down
// and re-broken across pages.
//
// The signal is the OS TIME ZONE, not navigator.language: a large share of
// users worldwide run an en-US browser, so the language would hand Letter to
// people in Berlin and Moscow. The zone comes from the machine's clock, so it
// also survives a VPN. A zone that is not listed falls through to A4 and the
// user can flip the Page size buttons in Settings.
const GPTPDF_LETTER_ZONE_PREFIXES = [
    'America/Indiana/', 'America/Kentucky/', 'America/North_Dakota/'
];
const GPTPDF_LETTER_ZONES = new Set([
    // United States
    'America/New_York', 'America/Detroit', 'America/Chicago', 'America/Menominee',
    'America/Denver', 'America/Boise', 'America/Phoenix', 'America/Los_Angeles',
    'America/Anchorage', 'America/Juneau', 'America/Sitka', 'America/Metlakatla',
    'America/Yakutat', 'America/Nome', 'America/Adak', 'Pacific/Honolulu',
    'America/Puerto_Rico', 'Pacific/Guam', 'Pacific/Saipan',
    // Canada
    'America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg',
    'America/Halifax', 'America/St_Johns', 'America/Regina', 'America/Moncton',
    'America/Whitehorse', 'America/Dawson', 'America/Dawson_Creek', 'America/Creston',
    'America/Fort_Nelson', 'America/Swift_Current', 'America/Atikokan',
    'America/Yellowknife', 'America/Iqaluit', 'America/Cambridge_Bay', 'America/Inuvik',
    'America/Rankin_Inlet', 'America/Resolute', 'America/Goose_Bay', 'America/Glace_Bay',
    'America/Blanc-Sablon',
    // Mexico
    'America/Mexico_City', 'America/Cancun', 'America/Merida', 'America/Monterrey',
    'America/Matamoros', 'America/Chihuahua', 'America/Ciudad_Juarez', 'America/Ojinaga',
    'America/Mazatlan', 'America/Bahia_Banderas', 'America/Hermosillo', 'America/Tijuana',
    // Philippines, Chile, Colombia and neighbours on Letter
    'Asia/Manila', 'America/Santiago', 'America/Punta_Arenas', 'Pacific/Easter',
    'America/Bogota', 'America/Caracas', 'America/Panama', 'America/Costa_Rica',
    'America/Guatemala', 'America/Santo_Domingo'
]);

gptpdfShared.defaultPageSize = function() {
    try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if(!zone) return 'a4';
        if(GPTPDF_LETTER_ZONES.has(zone)) return 'letter';
        if(GPTPDF_LETTER_ZONE_PREFIXES.some(p => zone.startsWith(p))) return 'letter';
        return 'a4';
    } catch(e) {
        return 'a4';
    }
};

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
    source_link: false,
    datetime_format: 'none',
    q_align: 'right',
    q_rounded: true,
    page_size: gptpdfShared.defaultPageSize(),
    orientation: '',
    single_page: false
}

gptpdfShared.version = 'v3.9';

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
                // A5 was retired in 1.1.6. A stored size the product no longer
                // offers would keep printing a page the Settings buttons cannot
                // show — the modal and the PDF would disagree, with no way back
                // — so anything but a live format falls through to the default.
                if(rv.page_size !== 'a4' && rv.page_size !== 'letter') {
                    rv.page_size = gptpdfShared.defaultPageSize();
                }
                callback(rv);
            });
        } catch(error) {
            console.error(error);
            callback(gptpdfShared.defaultOptions);
        }
    }
}
