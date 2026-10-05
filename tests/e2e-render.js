// Сквозной прогон: выгрузка живого стенда → НАСТОЯЩИЙ background.js → наш Gotenberg → PDF.
// Шлёт настоящий запрос на сервер (как обычный экспорт), поэтому в батарею стендов не входит —
// запускается руками, когда меняется то, что уходит на сервер.
//
//   1) снять выгрузку стенда (headless Chrome по http — нужен сервер exportgpt-stend, порт 8840):
//      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
//        --virtual-time-budget=60000 --dump-dom \
//        "http://localhost:8840/tests/blockmode-live-stand.html?auto=export" > /tmp/stand.html
//   2) node tests/e2e-render.js /tmp/stand.html /tmp/out.pdf
// Дальше PDF смотрят глазами и PDFKit-ом (страницы, номера, закладки, ссылки).
const fs = require('fs'), vm = require('vm'), path = require('path');
const [, , standDump, outPdf] = process.argv;
const html = fs.readFileSync(standDump, 'utf8');
// последнее вхождение: первое — комментарий в скрипте самого стенда
const all = [...html.matchAll(/<pre id="payload-dump">(\{[\s\S]*?|null)<\/pre>/g)];
const m = all[all.length - 1];
if (!m) { console.error('в выгрузке стенда нет <pre id="payload-dump">'); process.exit(1); }
const unescape = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const payload = JSON.parse(unescape(m[1]));
if (!payload) { console.error('стенд не дождался выгрузки'); process.exit(1); }

const src = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
const ctx = {
    console, setTimeout, clearTimeout, Promise, Error, fetch, FormData, Blob, FileReader: class {},
    chrome: {
        runtime: { onMessage: { addListener(){} }, onMessageExternal: { addListener(){} },
                   setUninstallURL(){}, getURL: p => p, OnInstalledReason: { INSTALL: 'install' },
                   onInstalled: { addListener(){} } },
        action: { onClicked: { addListener(){} } },
        storage: { local: { get(){}, set(){} }, sync: { get(){}, set(){} } },
        tabs: { create(){} },
        management: { getSelf(cb) { cb({ installType: 'development' }); } },
    },
};
vm.createContext(ctx);
vm.runInContext(src, ctx);
// background.js сам переводит ответ в data:-адрес через FileReader; здесь перехватываем раньше
const realFetch = ctx.fetch;
ctx.fetch = (url, opts) => realFetch(url, opts).then(async r => {
    const buf = Buffer.from(await r.clone().arrayBuffer());
    if (r.status === 200) { fs.writeFileSync(outPdf, buf); console.log('PDF:', outPdf, buf.length, 'байт'); }
    else console.log('сервер ответил', r.status, buf.toString().slice(0, 200));
    return new Promise(() => {});   // дальше background.js не нужен
});
console.log('параметры:', JSON.stringify({ page_numbers: payload.params.page_numbers, outline: payload.params.outline,
    page_size: payload.params.page_size, orientation: payload.params.orientation }));
vm.runInContext('sendToGotenberg', ctx)(payload.html, payload.params, () => {});
