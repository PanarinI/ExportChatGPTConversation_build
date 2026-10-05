// ─────────────────────────────────────────────────────────────────────────
// Export ChatGPT Conversation — МАССОВАЯ ЗАГРУЗКА ПОЛНЫХ ОПИСАНИЙ В CWS (канон 3.6, код — дословно из урока;
// тот же, что fill-in-the-blanks/vypusk/cws-upload-full.js и sound-focus-timer/lab/cws-upload-full.js).
// Читает storeDesc из _locales/<код>/messages.json и раскладывает полное описание по всем языкам листинга
// одним прогоном (иначе — 51 раз руками).
//
// КАК (делает автор в кабинете CWS):
//   1. Кабинет CWS → Export ChatGPT Conversation → Store Listing. ОБНОВИТЬ страницу.
//   2. F12 (Cmd+Option+J) → Console. Ругается на вставку — напечатать: allow pasting
//   3. Вставить ВЕСЬ код → Enter.
//   4. Зелёная кнопка сверху → выбрать ПАПКУ:  save-chatgpt-as-pdf/_locales
//      Именно её: там исправленные 04.10 описания (без раздела со списком профессий — письмо CWS
//      «Keyword Spam / Yellow Argon»). В dist/…/_locales старый текст — оттуда НЕ брать.
//   5. Подтвердить. Скрипт пройдёт все языки сам. 6. Save draft → обновить → проверить несколько языков
//      в «Current editing language» → Submit for review.
// 51 язык; he → iw — в скрипте.
// ─────────────────────────────────────────────────────────────────────────

const ANIMATION_TIMEOUT = 500

const fileInput = document.createElement('input')
fileInput.setAttribute("id", "filepicker")
fileInput.setAttribute("type", 'file')
fileInput.setAttribute("webkitdirectory", '')
fileInput.setAttribute("multiple", '')
fileInput.setAttribute("style", 'position: absolute;top: 0;z-index: 999;padding: 1rem;background: green;')
document.documentElement.append(fileInput)

document.getElementById("filepicker").addEventListener(
    "change",
    async (event) => {
        const files = event.target.files

        const locales = {}

        const localeFiles = Object.values(files).filter(f => f.name == 'messages.json').filter(f => f.type == 'application/json')

        for (const localeFile of localeFiles) {
            const localeCode = localeFile.webkitRelativePath.replace('_locales/', '').replace('/messages.json', '')
            const fileText = await localeFile.text()

            const localeJson = JSON.parse(fileText)
            if (localeJson.storeDesc) {
                locales[localeCode] = localeJson.storeDesc.message
            } else {
                console.error(`[${localeCode}] - no store desc for this locale: ${fileText}`)
            }
        }

        console.log("all locales:", locales)

        await uploadLocales(locales)
    },
    false,);

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function uploadLocales(locales) {
    const dropdown = document.evaluate("//h3[text()='Current editing language']/../../div[2]//div[@jsshadow]/div/div", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue

    for (const entry of Object.entries(locales)) {
        let code = entry[0].replace('_', '-')
        const description = entry[1]

        // Check and replace 'he' with 'iw'
        if (code === 'he') {
            code = 'iw'
        }

        console.log('upload locale:', code)

        dropdown.click()

        try {
            [...document.evaluate("//ul[@aria-label='Language']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.children]
                .filter(e => e.tagName == 'LI')
                .filter(e => e.getAttribute('data-value') == code)[0]
                .click()
        } catch (e) {
            console.error("cant find locale with code - ", code)
            continue
        }
        await sleep(ANIMATION_TIMEOUT)

        const textarea = document.evaluate("//textarea[@maxlength='16000']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
        textarea.dispatchEvent(new Event("focus"))
        textarea.value = description
        textarea.dispatchEvent(new Event('input', {
            bubbles: true,
        }))
        await sleep(ANIMATION_TIMEOUT)
    }
}
