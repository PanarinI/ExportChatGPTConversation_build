// Тест проводного формата: какие paperWidth/paperHeight реально уходят на
// Gotenberg. Гоняет НАСТОЯЩИЙ background.js в песочнице с заглушками
// chrome/fetch/FormData и перехватывает тело запроса — тем же приёмом, каким
// 1.1.3 проверяли формат GA4-событий.
//
// Зачем: 08-22 замером на сервере поймано, что флаг Gotenberg `landscape` —
// это ровно перестановка ширины и высоты, а в одностраничном режиме высота
// принудительно 200in. Вместе они меняли местами НЕ ту пару: одностраничный
// альбомный уезжал листом 200in В ШИРИНУ и 8.28in в высоту — весь чат в полосе
// длиной пять метров. Теперь обе стороны считаются в background.js, флаг не
// шлётся вовсе. Этот тест стережёт, чтобы 200in никогда не стали шириной.
//
// Запуск (из корня проекта):
//   node tests/paper-wire-test.js
const fs = require('fs'), vm = require('vm');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');

let sent = null;
const ctx = {
    console,
    setTimeout, clearTimeout,
    Promise, Error, FileReader: class {},
    Blob: class { constructor(p, o) { this.parts = p; this.type = o && o.type; } },
    FormData: class {
        constructor() { this.f = {}; }
        append(k, v) { this.f[k] = (v && v.parts) ? '<html>' : String(v); }
    },
    fetch: (url, opts) => { sent = opts.body.f; return new Promise(() => {}); },
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

function paper(params) {
    sent = null;
    vm.runInContext('sendToGotenberg', ctx)('<html></html>', params, () => {});
    return { w: sent.paperWidth, h: sent.paperHeight, landscapeFlag: 'landscape' in sent };
}

const out = [];
let failed = 0;
function eq(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failed++;
    out.push((ok ? '✓ ' : '✗ ') + name.padEnd(42) + ' → ' + JSON.stringify(got) +
             (ok ? '' : '  (ждали ' + JSON.stringify(want) + ')'));
}

const P = (o) => { const r = paper(o); return [r.w + '×' + r.h, r.landscapeFlag]; };

// A4
eq('A4 книжный',              P({ page_size: 'a4' }),                                  ['8.27×11.69', false]);
eq('A4 альбомный',            P({ page_size: 'a4', orientation: 'landscape' }),        ['11.69×8.27', false]);
eq('A4 одностраничный',       P({ page_size: 'a4', single_page: true }),               ['8.27×200', false]);
eq('A4 одностраничный+альбом',P({ page_size: 'a4', single_page: true, orientation: 'landscape' }),
                                                                                       ['11.69×200', false]);
// Letter
eq('Letter книжный',          P({ page_size: 'letter' }),                              ['8.5×11', false]);
eq('Letter альбомный',        P({ page_size: 'letter', orientation: 'landscape' }),    ['11×8.5', false]);
eq('Letter одностраничный',   P({ page_size: 'letter', single_page: true }),           ['8.5×200', false]);
eq('Letter одностр.+альбом',  P({ page_size: 'letter', single_page: true, orientation: 'landscape' }),
                                                                                       ['11×200', false]);
// старый путь одностраничности (page_height:'-1') и неизвестный формат
eq('page_height=-1 = одностраничный', P({ page_size: 'a4', page_height: '-1' }),       ['8.27×200', false]);
eq('page_height=-1 + альбомный',      P({ page_size: 'a4', page_height: '-1', orientation: 'landscape' }),
                                                                                       ['11.69×200', false]);
eq('неизвестный формат → A4',         P({ page_size: 'wat' }),                         ['8.27×11.69', false]);
eq('формат не задан → A4',            P({}),                                           ['8.27×11.69', false]);

// главное: высота одностраничного НИКОГДА не уезжает в ширину
const singles = [
    P({ page_size: 'a4', single_page: true, orientation: 'landscape' }),
    P({ page_size: 'letter', single_page: true, orientation: 'landscape' }),
    P({ page_size: 'a4', page_height: '-1', orientation: 'landscape' }),
];
eq('200in никогда не становится шириной', singles.every(s => !s[0].startsWith('200')), true);

console.log(out.join('\n'));
console.log('\n' + (failed ? '❌ провалено: ' + failed : '✅ все проверки пройдены'));
process.exit(failed ? 1 : 0);
