// ─────────────────────────────────────────────────────────────────────────
// Export ChatGPT Conversation — ПРОВЕРКА полных описаний в кабинете CWS по всем языкам
// (и починка тех, что не совпали). Дополняет скрипт урока 3.6 (tools/cws-upload-full.js):
// тот заливает вслепую, с паузой 0,5 с на язык, и не проверяет, что язык переключился.
// После второго отказа «Keyword Spam / Yellow Argon» (05.10) нужно знать наверняка, что в
// кабинете в КАЖДОМ языке лежит исправленный текст.
//
// КАК (делает автор в кабинете CWS):
//   1. Кабинет CWS → Export ChatGPT Conversation → Store Listing. ОБНОВИТЬ страницу.
//   2. F12 (Cmd+Option+J) → Console. Ругается на вставку — напечатать: allow pasting
//   3. Вставить ВЕСЬ код → Enter.
//   4. Зелёная кнопка сверху → выбрать ПАПКУ  save-chatgpt-as-pdf/_locales  → подтвердить.
//   5. Скрипт пройдёт все языки: прочтёт описание в кабинете, сравнит с нашим файлом, несовпавшее
//      перепишет и прочтёт ещё раз. Ход и итог — в панели справа сверху на самой странице
//      (и таблицей в консоли). Дождаться строки «Готово».
//   6. Если были исправления — Save draft. Можно запустить ещё раз (обновив страницу): все строки
//      должны быть «совпадает».
//
// Переписывает язык, ТОЛЬКО убедившись, что кабинет на него переключился (название языка в
// выпадающем списке совпало с выбранным пунктом); иначе пишет «не переключился» и не трогает поле —
// чтобы не залить текст в соседний язык. Селекторы — те же, что в скрипте урока.
// ─────────────────────────────────────────────────────────────────────────

// По умолчанию ТОЛЬКО ЧИТАЕТ (05.10: два прогона подряд «исправлено 51» — запись вслепую не доказывает ничего).
// Для починки перед вставкой выполнить в консоли: window.GPTPDF_FIX = true
const FIX = (typeof window.GPTPDF_FIX === 'boolean') ? window.GPTPDF_FIX : false
const STEP = 150            // мс между проверками
const WAIT = 8000           // мс на переключение языка
const SETTLE = 600          // мс после открытия списка

const sleep = ms => new Promise(r => setTimeout(r, ms))
// Сравнение по содержанию: Unicode в одной форме, без невидимых селекторов эмодзи, пробелы и переносы схлопнуты —
// кабинет может подрезать пробелы и перекодировать эмодзи при сохранении
const norm = s => (s || '').normalize('NFC').replace(/[\uFE0E\uFE0F\u200D]/g, '').replace(/\s+/g, ' ').trim()
// где тексты расходятся: место и по 40 знаков с обеих сторон
function diff(a, b) {
    const x = norm(a), y = norm(b)
    let i = 0
    while (i < x.length && i < y.length && x[i] === y[i]) i++
    return 'с ' + i + '-го знака: кабинет «' + x.slice(i, i + 40) + '» · файл «' + y.slice(i, i + 40) + '»'
}
// видимое поле описания (если кабинет держит по полю на язык, первое в DOM может быть чужим)
const areaEl = () => [...document.querySelectorAll("textarea[maxlength='16000']")].find(t => t.offsetParent !== null) || byXPath(AREA)
// значение поля, когда оно перестало меняться (кабинет подгружает текст языка не сразу)
async function stableValue(prev) {
    let last = null, same = 0
    for (let t = 0; t < WAIT; t += STEP) {
        await sleep(STEP)
        const v = (areaEl() || {}).value
        if (v === last) { same++; if (same >= 6 && v !== prev) return v } else { same = 0; last = v }
    }
    return (areaEl() || {}).value
}
const byXPath = x => document.evaluate(x, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
const DROPDOWN = "//h3[text()='Current editing language']/../../div[2]//div[@jsshadow]/div/div"
const LIST = "//ul[@aria-label='Language']"
const AREA = "//textarea[@maxlength='16000']"

const picker = document.createElement('input')
picker.type = 'file'
picker.setAttribute('webkitdirectory', '')
picker.multiple = true
picker.setAttribute('style', 'position:absolute;top:0;z-index:999;padding:1rem;background:green;')
document.documentElement.append(picker)

picker.addEventListener('change', async (event) => {
    const expected = {}
    for (const f of [...event.target.files].filter(f => f.name === 'messages.json')) {
        const code = f.webkitRelativePath.replace('_locales/', '').replace('/messages.json', '')
        const json = JSON.parse(await f.text())
        if (json.storeDesc) expected[code] = json.storeDesc.message
    }
    console.log('языков в папке:', Object.keys(expected).length)
    await run(expected)
})

async function selectLanguage(code) {
    const dropdown = byXPath(DROPDOWN)
    if (!dropdown) return 'не нашёл выпадающий список языков'
    dropdown.click()
    await sleep(SETTLE)
    const list = byXPath(LIST)
    const item = list && [...list.children].find(e => e.tagName === 'LI' && e.getAttribute('data-value') === code)
    if (!item) { document.body.click(); await sleep(SETTLE); return 'нет такого языка в кабинете' }
    const name = item.textContent.trim()
    item.click()
    for (let t = 0; t < WAIT; t += STEP) {
        await sleep(STEP)
        const shown = (byXPath(DROPDOWN) || {}).textContent || ''
        if (name && shown.includes(name) && areaEl()) return ''
    }
    return 'не переключился'
}

// Панель на странице: ход по языкам и итог. Консоль у кабинета шумная, таблицу в ней легко не найти.
function panel() {
    let box = document.getElementById('gptpdf-check-panel')
    if (box) return box
    box = document.createElement('div')
    box.id = 'gptpdf-check-panel'
    box.setAttribute('style', 'position:fixed;top:12px;right:12px;z-index:100000;width:340px;max-height:80vh;' +
        'overflow:auto;background:#fff;color:#111;border:2px solid #188038;border-radius:10px;padding:10px 12px;' +
        'font:13px/1.5 ui-monospace,Menlo,monospace;box-shadow:0 6px 24px rgba(0,0,0,.25)')
    // Без innerHTML: кабинет CWS требует Trusted Types и такую запись блокирует (05.10, первый живой запуск).
    const title = document.createElement('b')
    title.textContent = 'Проверка описаний '
    const count = document.createElement('span')
    count.id = 'gptpdf-check-count'
    const sum = document.createElement('div')
    sum.id = 'gptpdf-check-sum'
    sum.setAttribute('style', 'margin:6px 0;font-weight:bold')
    const list = document.createElement('div')
    list.id = 'gptpdf-check-rows'
    box.append(title, count, sum, list)
    document.body.append(box)
    return box
}
function report(row, done, total) {
    panel()
    const ok = row.итог === 'совпадает' || row.итог === 'исправлено'
    const line = document.createElement('div')
    line.textContent = row.язык + ' — ' + row.итог
    line.style.color = ok ? (row.итог === 'исправлено' ? '#b06000' : '#188038') : '#c5221f'
    document.getElementById('gptpdf-check-rows').append(line)
    document.getElementById('gptpdf-check-count').textContent = done + ' из ' + total
}

async function run(expected) {
    const rows = []
    const total = Object.keys(expected).length
    panel()
    const push = row => { rows.push(row); report(row, rows.length, total) }
    let prev = (areaEl() || {}).value
    for (const [folderCode, text] of Object.entries(expected)) {
        let code = folderCode.replace('_', '-')
        if (code === 'he') code = 'iw'
        const problem = await selectLanguage(code)
        if (problem) { push({ язык: folderCode, итог: problem }); continue }
        const value = await stableValue(prev)
        prev = value
        if (norm(value) === norm(text)) { push({ язык: folderCode, итог: 'совпадает' }); continue }
        if (!FIX) { push({ язык: folderCode, итог: 'отличается ' + diff(value, text) }); continue }
        const area = areaEl()
        area.dispatchEvent(new Event('focus'))
        area.value = text
        area.dispatchEvent(new Event('input', { bubbles: true }))
        const again = await stableValue(null)
        prev = again
        push({ язык: folderCode, итог: norm(again) === norm(text) ? 'исправлено' : 'НЕ удалось исправить' })
    }
    console.table(rows)
    const bad = rows.filter(r => r.итог !== 'совпадает' && r.итог !== 'исправлено')  // «отличается …» — тоже сюда
    const fixed = rows.filter(r => r.итог === 'исправлено')
    console.log('совпадает:', rows.length - bad.length - fixed.length, '· исправлено:', fixed.length, '· проблемы:', bad.length)
    if (fixed.length) console.log('→ нажмите Save draft, обновите страницу и запустите проверку ещё раз')
    if (bad.length) console.log('→ проблемные языки:', bad.map(r => r.язык + ' (' + r.итог + ')').join(', '))
    const sum = document.getElementById('gptpdf-check-sum')
    sum.textContent = 'Готово. Совпадает: ' + (rows.length - bad.length - fixed.length) + ' · исправлено: ' +
        fixed.length + ' · проблемы: ' + bad.length +
        (fixed.length ? ' → нажмите Save draft, обновите страницу и запустите ещё раз' : '') +
        (!fixed.length && !bad.length ? ' → всё чисто, можно Submit for review' : '')
    sum.style.color = bad.length ? '#c5221f' : (fixed.length ? '#b06000' : '#188038')
}
