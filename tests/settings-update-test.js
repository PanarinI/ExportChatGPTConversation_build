// Тест умолчаний и обновления: что видит человек в настройках после установки
// и после обновления расширения. Гоняет НАСТОЯЩИЕ background.js и shared.js в
// песочнице с заглушками chrome — тем же приёмом, что paper-wire-test.js.
//
// Зачем. До 1.1.10 обновление дописывало июньские ключи проверкой «если пусто»,
// а «выключено» и есть пусто: оглавление «None» = '', ссылка выкл = false, дата
// «None» = 'none' — каждое обновление включало их обратно (найдено 03.10,
// подтверждено живым тестом автора 04.10). До 1.1.11 установка к тому же писала
// свой набор умолчаний (дата и ссылка вкл), а «Reset to defaults» — другой
// (выкл). С 1.1.11 набор один — shared.js, установка и обновление настроек не
// пишут вовсе, getOptions кладёт сохранённое человеком поверх умолчаний
// (DECISIONS 10-04).
//
// Запуск (из корня проекта):
//   node tests/settings-update-test.js
const fs = require('fs'), vm = require('vm');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

let store = {};
let writes = 0;
const listeners = [];
const chrome = {
    runtime: { onMessage: { addListener(){} }, onMessageExternal: { addListener(){} },
               setUninstallURL(){}, getURL: p => p, OnInstalledReason: { INSTALL: 'install' },
               onInstalled: { addListener(f) { listeners.push(f); } } },
    action: { onClicked: { addListener(){} } },
    storage: {
        local: { get(){}, set(o, cb) { if (cb) cb(); } },
        sync: {
            get(k, cb) { cb(JSON.parse(JSON.stringify(store))); },
            set(o, cb) { writes++; Object.assign(store, JSON.parse(JSON.stringify(o))); if (cb) cb(); },
        },
    },
    tabs: { create(){} },
    management: { getSelf(cb) { cb({ installType: 'development' }); } },
};

// background.js — в своей песочнице
const bg = { console, setTimeout, clearTimeout, Promise, Error, chrome,
             FileReader: class {}, Blob: class {}, FormData: class {},
             fetch: () => new Promise(() => {}) };
vm.createContext(bg);
vm.runInContext(read('background.js'), bg);

// shared.js — в своей (content script): часовой пояс Европы → A4
const page = { console, chrome, navigator: { userAgent: 'Chrome', language: 'en' },
               Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'Europe/Berlin' }) }) } };
vm.createContext(page);
vm.runInContext(read('shared.js') + '\n;this.gptpdfShared = gptpdfShared;', page);
const shared = page.gptpdfShared;

function fire(reason, options) {
    store = options === undefined ? {} : { options: JSON.parse(JSON.stringify(options)) };
    writes = 0;
    listeners.forEach(f => f({ reason: reason, previousVersion: '1.1.10' }));
    return { stored: store.options, writes: writes };
}
function read_(options) {
    store = options === undefined ? {} : { options: options };
    let got;
    shared.getOptions(o => { got = o; });
    return got;
}

const out = [];
let failed = 0;
function eq(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failed++;
    out.push((ok ? '✓ ' : '✗ ') + name.padEnd(56) + ' → ' + JSON.stringify(got) +
             (ok ? '' : '  (ждали ' + JSON.stringify(want) + ')'));
}

out.push('— Установка и обновление настроек не пишут —');
const inst = fire('install', undefined);
eq('установка: в хранилище ничего', [inst.stored, inst.writes], [undefined, 0]);
const off = { toc: '', datetime_format: 'none', source_link: false, theme: 'dark', zoom: 90 };
const up = fire('update', off);
eq('обновление: выключенное человеком не тронуто', up.stored, off);
eq('обновление: записей в хранилище — ноль', up.writes, 0);
const old = { toc: 'basic', datetime_format: 'date_only', source_link: true };
eq('обновление: включённое (как писала установка до 1.1.11) не тронуто', fire('update', old).stored, old);

out.push('');
out.push('— Новый человек видит один набор умолчаний —');
const fresh = read_(undefined);
eq('дата выгрузки — выкл', fresh.datetime_format, 'none');
eq('ссылка на чат — выкл', fresh.source_link, false);
eq('номера страниц — вкл', fresh.page_numbers, true);
eq('оглавление — Standard', fresh.toc, 'basic');
eq('модели в настройках нет', 'model_name' in fresh, false);
eq('«Reset to defaults» = то же самое', JSON.stringify(shared.defaultOptions) === JSON.stringify(
    Object.assign({}, shared.defaultOptions, { page_size: fresh.page_size })), true);

out.push('');
out.push('— Человек 1.1.10 после обновления: его выбор цел, новое — по умолчанию —');
const kept = read_({ toc: '', datetime_format: 'date_only', source_link: true, zoom: 120 });
eq('его оглавление «None» осталось', kept.toc, '');
eq('его дата и ссылка остались', [kept.datetime_format, kept.source_link], ['date_only', true]);
eq('номера страниц, которых у него не было, — вкл', kept.page_numbers, true);
eq('его масштаб цел', kept.zoom, 120);
const chose = read_({ page_numbers: false });
eq('выключенные номера страниц остаются выключенными', chose.page_numbers, false);

console.log(out.join('\n'));
console.log(failed ? '\n✗ провалов: ' + failed : '\n✅ все проверки пройдены');
process.exitCode = failed ? 1 : 0;
