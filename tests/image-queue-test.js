// Очередь картинок из-за входа ChatGPT (helpers.js, gptpdfFetchImageData).
//
// Зачем: до 1.2.0 все картинки чата запрашивались разом, 5 с каждой, без
// повтора — в четырёх выгрузках одного чата автора («Художник_базовый», 07.10)
// вышло 35, 36, 40 и 38 картинок, на месте потерянных — пустые рамки.
// Проверяет: не больше четырёх запросов одновременно; неудачный запрос
// повторяется один раз; потерянные считаются.
//
// Запуск: node tests/image-queue-test.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let active = 0, peak = 0, calls = 0;
const attempts = {};
// «Фон»: картинка bad-* падает всегда, flaky-* — только с первого раза.
const ctx = {
    console,
    chrome: { runtime: { sendMessage(msg, cb) {
        calls++; active++; peak = Math.max(peak, active);
        const n = attempts[msg.src] = (attempts[msg.src] || 0) + 1;
        setTimeout(function() {
            active--;
            const fail = msg.src.startsWith('bad') || (msg.src.startsWith('flaky') && n === 1);
            cb({ data: fail ? null : 'data:image/png;base64,' + msg.src });
        }, 20 + (msg.src.length % 5) * 7);
    } } },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'helpers.js'), 'utf8') +
    '\n;this.gptpdfFetchImageData = gptpdfFetchImageData;' +
    'this.gptpdfImageQueue = gptpdfImageQueue;' +
    'this.gptpdfImageStatsReset = gptpdfImageStatsReset;', ctx);

const srcs = [];
for(let i = 0; i < 50; i++) srcs.push('ok-' + i);
for(let i = 0; i < 8; i++) srcs.push('flaky-' + i);
for(let i = 0; i < 3; i++) srcs.push('bad-' + i);

let failed = 0;
function check(name, cond, detail) {
    if(!cond) failed++;
    console.log((cond ? '✓ ' : '✗ ') + name + (detail ? '   → ' + detail : ''));
}

ctx.gptpdfImageStatsReset();
Promise.all(srcs.map(s => ctx.gptpdfFetchImageData(s))).then(function(results) {
    const got = results.filter(Boolean).length;
    check('не больше четырёх запросов одновременно', peak <= 4, 'пик ' + peak);
    check('все хорошие и «со второго раза» картинки получены', got === 58, 'получено ' + got + ' из 61');
    check('неудачный запрос повторён ровно один раз',
          attempts['flaky-0'] === 2 && attempts['bad-0'] === 2 && attempts['ok-0'] === 1,
          'flaky ' + attempts['flaky-0'] + ', bad ' + attempts['bad-0'] + ', ok ' + attempts['ok-0']);
    check('потерянные посчитаны', ctx.gptpdfImageQueue.failed === 3 && ctx.gptpdfImageQueue.ok === 58,
          'ok ' + ctx.gptpdfImageQueue.ok + ', lost ' + ctx.gptpdfImageQueue.failed);
    check('очередь пуста в конце', ctx.gptpdfImageQueue.active === 0 && ctx.gptpdfImageQueue.waiting.length === 0);
    console.log('\n' + (failed ? '❌ провалено проверок: ' + failed : '✅ все проверки пройдены'));
    process.exit(failed ? 1 : 0);
});
