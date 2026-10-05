// Тест «обвязки листа»: номера страниц и закладки — что уходит на Gotenberg.
// Гоняет НАСТОЯЩИЙ background.js в песочнице с заглушками chrome/fetch/FormData
// и записывает каждое поле формы вместе с именами файлов (paper-wire-test.js
// проверяет бумагу; здесь — то, что добавлено в 1.1.11).
//
// Что замерено на нашем сервере 04.10 (Gotenberg 8.34.0) и чему этот тест
// держит код верным:
//   • номера страниц — файл footer.html с pageNumber / totalPages, печатается в
//     нижнем поле каждой страницы: полю нужна высота, иначе номер срезан;
//   • фон на шаблоне номера расползается на ВЕСЬ лист (тёмный экспорт 04.10 вышел
//     сплошным тёмным листом с одним номером) — у шаблона фона нет; тёмный лист
//     красит @page вместе с полями, и поля у тёмной темы те же, что у светлой;
//   • в шаблоне не работает высота в процентах — номер опускается отступом от
//     высоты поля и встаёт ≈0.25in над краем листа при любом поле;
//   • закладки строятся только в размеченном PDF: generateDocumentOutline без
//     generateTaggedPdf дал ноль закладок.
//
// Запуск (из корня проекта):
//   node tests/page-furniture-test.js
const fs = require('fs'), vm = require('vm');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');

let sent = null;
class FD {
    constructor() { this.fields = []; }
    append(k, v, name) {
        this.fields.push({ k, v: (v && v.parts) ? v.parts.join('') : String(v), name });
    }
}
const ctx = {
    console, setTimeout, clearTimeout, Promise, Error, FileReader: class {},
    Blob: class { constructor(p, o) { this.parts = p; this.type = o && o.type; } },
    FormData: FD,
    fetch: (url, opts) => { sent = opts.body.fields; return new Promise(() => {}); },
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

function send(params) {
    sent = null;
    vm.runInContext('sendToGotenberg', ctx)('<html><head></head><body></body></html>', params, () => {});
    const field = k => { const f = sent.filter(x => x.k === k); return f.length ? f[f.length - 1].v : undefined; };
    const count = k => sent.filter(x => x.k === k).length;
    const files = sent.filter(x => x.k === 'files').map(x => x.name);
    const footer = (sent.find(x => x.k === 'files' && x.name === 'footer.html') || {}).v || '';
    const index = (sent.find(x => x.k === 'files' && x.name === 'index.html') || {}).v || '';
    const drop = (footer.match(/padding-top:([0-9.]+)in/) || [])[1];
    return { field, count, files, footer, index, drop };
}

const out = [];
let failed = 0;
function eq(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failed++;
    out.push((ok ? '✓ ' : '✗ ') + name.padEnd(58) + ' → ' + JSON.stringify(got) +
             (ok ? '' : '  (ждали ' + JSON.stringify(want) + ')'));
}

out.push('— Номера страниц —');
let r = send({ page_numbers: true });
eq('footer.html уходит вторым файлом рядом с index.html', r.files, ['index.html', 'footer.html']);
eq('в нём номер и общее число страниц', /class="pageNumber"/.test(r.footer) && /class="totalPages"/.test(r.footer), true);
eq('обычное поле 0.4in — места хватает, не трогаем', r.field('marginBottom'), '0.4');
eq('номер опущен на высоту поля без 0.21in', r.drop, '0.19');
eq('каждое поле отправлено ровно один раз', ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].map(r.count), [1, 1, 1, 1]);
r = send({ page_numbers: true, no_margins: true });
eq('минимальные поля: нижнее поднято под номер', r.field('marginBottom'), '0.35');
eq('…и номер опущен под это поле', r.drop, '0.14');
eq('остальные минимальные поля — как были', [r.field('marginTop'), r.field('marginLeft')], ['0.1', '0.1']);
r = send({ page_numbers: true, margin_left: '1in', margin_right: '1in', margin_top: '1in', margin_bottom: '0.2in' });
eq('свои поля: нижнее 0.2in поднято до 0.35', r.field('marginBottom'), '0.35');
r = send({ page_numbers: true, margin_left: '1in', margin_right: '1in', margin_top: '1in', margin_bottom: '1in' });
eq('свои поля: нижнее 1in не уменьшается', r.field('marginBottom'), '1');
eq('…номер опущен глубже — к краю листа', r.drop, '0.79');
r = send({ page_numbers: true, page_background_color: '212121' });
eq('тёмная тема: поля как у светлой', [r.field('marginTop'), r.field('marginBottom'), r.field('marginLeft')], ['0.4', '0.4', '0.4']);
eq('тёмная тема: лист вместе с полями красит @page', r.index.indexOf('@page{background:#212121}') !== -1, true);
eq('тёмная тема: у шаблона номера фона нет', /background/.test(r.footer), false);
r = send({ page_numbers: true });
eq('светлая тема: у шаблона номера фона нет', /background/.test(r.footer), false);
eq('светлая тема: @page не красится', r.index.indexOf('@page') === -1, true);
r = send({ page_numbers: true, single_page: true });
eq('один длинный лист — номеров нет', r.files, ['index.html']);
r = send({ page_numbers: false });
eq('номера выключены — footer.html нет', r.files, ['index.html']);
r = send({ page_numbers: false, page_background_color: '212121' });
eq('без номеров на тёмной — поля те же, что у светлой', [r.field('marginTop'), r.field('marginBottom')], ['0.4', '0.4']);

out.push('');
out.push('— Закладки —');
r = send({ outline: true });
eq('с оглавлением: закладки и размеченный PDF', [r.field('generateDocumentOutline'), r.field('generateTaggedPdf')], ['true', 'true']);
r = send({ outline: false });
eq('без оглавления: ни того, ни другого', [r.field('generateDocumentOutline'), r.field('generateTaggedPdf')], [undefined, undefined]);

console.log(out.join('\n'));
console.log(failed ? '\n✗ провалов: ' + failed : '\n✅ все проверки пройдены');
process.exitCode = failed ? 1 : 0;
