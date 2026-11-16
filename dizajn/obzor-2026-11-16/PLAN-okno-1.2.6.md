# План: новое окно настроек в 1.2.6 (16.11)

**Слово автора 16.11, после теста 1.2.6-dev:** «у меня точно такой же экран… те же самые окно настроек». Уточнение
к «двум версиям»: **1.2.6 = основа вида + новое окно настроек** (по макету `maket/nastrojki.html`, README §8);
следующая версия — новые выгрузки, если их поддержит замер.

Образец — макет v1. Паритет — таблица README §8. Ни один нынешний пункт не теряется.

## Шаги
1. **Модель** (`shared.js`): стили `chat · doc · compact`, ключи `look_font` (sans · serif · narrow),
   `look_size` (9–14 pt), `look_spacing` (tight · normal · airy), `q_look` (bubble · heading), `q_color` (те же 9),
   `look_base` — от какого стиля ушли. `gptpdfShared.look(o)` — вид из настроек; старый `zoom` → размер в pt
   (11 × zoom/100, в пределах 9–14), сам `zoom` больше не масштабирует лист.
2. **PDF** (`render.js` `buildExportCss(theme, dark, look)`): шрифт, размер, интервал и ритм из вида; вопрос-строка
   (heading). Шрифты на сервере: Noto Sans · Noto Serif · Carlito · Noto Sans Mono.
3. **Окно** (`templates.js` разметка и CSS, `settings.js` логика): лист слева, закладки Style · Paper · Header,
   плитки, ручки, «Custom · ↺», сохранение сразу, «Done», «Reset to defaults», версия внизу.
   Paper: Size + ориентация · Sheet Light/Dark · Margins Normal/Narrow/Minimal/Custom (мм) ·
   Page breaks Auto/Each question/One long page (= `page_break` + `single_page`) · Page numbers.
   Header: Title · Export date · Contents (None/List/Numbered = '' / basic / numbering) · Link to the chat.
4. **Лист-превью** (`preview.js`): первая страница из живого чата — заголовок, вопросы на экране, первая пара;
   свёрстан теми же стилями, что PDF. Начало длинного чата не загружено → лист из того, что на экране, без номера,
   строка под листом. Запоминание первой страницы после экспорта — следующим шагом (PRIVACY.md).
5. **Миниатюра в меню** вместо строки «Settings ›»: тот же лист в малом размере, подпись «стиль · бумага · Settings ›».
6. **Шрифты в расширение** — после слова автора на скачивание (Google Fonts, OFL; латиница + кириллица).
   Грузятся через `FontFace` из байтов файла — CSP страницы ChatGPT их не режет.
7. **Проверка:** тесты (node + стенды), стенд окна настоящими щелчками, прогон стилей через сервер, `make dev`,
   локальный коммит.
