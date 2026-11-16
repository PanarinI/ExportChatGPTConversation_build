// Вид листа 1.2.6: три стиля и ручки под ними (shared.js), стили PDF из вида (render.js).
// node tests/look-test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, window: {}, document: {}, localStorage: { getItem() {}, setItem() {} },
    chrome: { runtime: { getManifest: () => ({ version: '1.2.6' }) }, storage: { sync: { get() {} } } },
    navigator: { language: 'en-US', userAgent: 'Chrome' }, Intl };
vm.createContext(ctx);
for (const f of ['shared.js', 'theme.js', 'render.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
const run = code => vm.runInContext(code, ctx);
const out = []; let failed = 0;
function eq(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failed++;
    out.push((ok ? '✓ ' : '✗ ') + name.padEnd(60) + ' → ' + JSON.stringify(got) + (ok ? '' : '  (ждали ' + JSON.stringify(want) + ')'));
}
const look = o => run('gptpdfShared.look(' + JSON.stringify(o) + ')');
const style = o => run('gptpdfShared.lookStyle(' + JSON.stringify(o) + ')');
const css = (o, dark) => run('buildExportCss(EXPORT_THEMES[gptpdfShared.look(' + JSON.stringify(o) + ').qColor]||EXPORT_THEMES.default,' + !!dark + ',gptpdfShared.look(' + JSON.stringify(o) + '))');

out.push('— Модель вида —');
eq('пустые настройки = Chat', style({}), 'chat');
eq('настройки до 1.2.6 (q_color default, zoom 100) = Chat', style({ zoom: 100, q_color: 'default' }), 'chat');
eq('старый zoom 150 % → 14 pt (больше 14 не бывает)', look({ zoom: 150 }).size, 14);
eq('старый zoom 70 % → 9 pt (меньше 9 не бывает)', look({ zoom: 70 }).size, 9);
eq('старый zoom 120 % → 13 pt', look({ zoom: 120 }).size, 13);
eq('свой размер важнее старого zoom', look({ zoom: 150, look_size: 10.5 }).size, 10.5);
for (const k of ['chat', 'doc', 'compact'])
    eq('стиль ' + k + ' узнаётся по своим ручкам', style(run('gptpdfShared.LOOK_STYLES.' + k)), k);
eq('тронутая ручка = Custom', style(Object.assign({}, run('gptpdfShared.LOOK_STYLES.doc'), { look_size: 12 })), '');
eq('цвет вопроса — тоже ручка стиля', style({ q_color: 'rose' }), '');

out.push('', '— Стили PDF из вида —');
// The text font rule leaves KaTeX's formulas out (they keep KaTeX's own fonts).
const fam = c => (c.match(/body,p,li,td,th,blockquote,div:not\(\.katex \*\),span:not\(\.katex\):not\(\.katex \*\),a,strong,em,b,i\{font-family:([^!]*)!/) || [])[1].trim();
eq('Chat — Noto Sans', fam(css({})).split(',')[0], '"Noto Sans"');
eq('Document — Noto Serif', fam(css(run('gptpdfShared.LOOK_STYLES.doc'))).split(',')[0], '"Noto Serif"');
eq('Compact — Carlito', fam(css(run('gptpdfShared.LOOK_STYLES.compact'))).split(',')[0], 'Carlito');
eq('формулы не получают шрифт текста', /div:not\(\.katex \*\)/.test(css({})), true);
eq('у формул нет подмены на Times', /\.katex-html \.mathnormal/.test(css({})), false);
eq('абзац ответа идёт в направлении своего языка (арабский, иврит — от правого края)', /\[data-message-author-role="assistant"\] :is\(p,h1,h2,h3,h4,h5,h6\):not\(li \*\)\{unicode-bidi:plaintext\}/.test(css({})), true);
eq('Chat — 11 pt, интервал 1.55', /body\{font-size:11pt !important;line-height:1.55/.test(css({})), true);
eq('Compact — 10 pt, интервал 1.3', /body\{font-size:10pt !important;line-height:1.3/.test(css(run('gptpdfShared.LOOK_STYLES.compact'))), true);
eq('Chat — вопрос пузырём справа', /justify-content:flex-start/.test(css({})), false);
eq('Document — вопрос строкой слева', /justify-content:flex-start/.test(css(run('gptpdfShared.LOOK_STYLES.doc'))), true);
eq('Document без цвета — строка без полосы', /width:100% !important;max-width:100% !important;border-radius:3pt !important;padding:0 /.test(css(run('gptpdfShared.LOOK_STYLES.doc'))), true);
eq('Compact с серым — строка на полосе', /border-radius:3pt !important;padding:4pt 8pt/.test(css(run('gptpdfShared.LOOK_STYLES.compact'))), true);
eq('светлый лист: текст #1f1f1f', /body\{color:#1f1f1f/.test(css({})), true);
eq('тёмный лист: светлого цвета текста нет', /body\{color:#1f1f1f/.test(css({}, true)), false);
eq('тёмный лист: фон #212121', css({}, true).indexOf('#212121') !== -1, true);

out.push('', '— Длинный вопрос (16.11: вопрос наезжал на ответ) —');
eq('свёрнутый вопрос (max-height: 19lh) раскрыт целиком', /\[data-message-author-role="user"\] \[style\*="max-height"\]\{max-height:none !important\}/.test(css({})), true);
eq('многоточие под свёрнутым вопросом спрятано', /\[style\*="max-height"\] ~ span\[aria-hidden="true"\]\{display:none/.test(css({})), true);
eq('вопрос держит свои переносы строк', /\[data-message-author-role="user"\] \.whitespace-pre-wrap\{white-space:pre-wrap/.test(css({})), true);

out.push('', failed ? '❌ провалено проверок: ' + failed : '✅ все проверки пройдены');
console.log(out.join('\n'));
process.exit(failed ? 1 : 0);
