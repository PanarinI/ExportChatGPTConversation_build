# Новые выгрузки ExportGPT — сколько ищут каждую цель (замер 16.11.2026)

Тиры: ✅ измерено · 🧮 выведено · 🔶 догадка или чужие слова · ⬜ нет данных.

## Вопрос

- Стоит ли в следующей версии ExportGPT добавить выгрузки кроме PDF — и какие.
- По каждой цели: сколько её ищут (США и мир), растёт спрос или падает, насколько труден ключ, занято ли имя в Chrome Web Store.
- Цели: Word и docx, Google Docs, Markdown, Obsidian, Notion, txt, HTML, JSON, картинка, таблицы Excel/CSV, EPUB;
  «обратно в ИИ» — Claude, Gemini, NotebookLM, «продолжить в новом чате»; бэкап всей истории;
  для сравнения — наши нынешние двери (`export chatgpt conversation`, `chatgpt to pdf`, `chatgpt exporter`, `save chatgpt conversation`).
- Это функции внутри готового продукта: гейты нового продукта (750 / 3 000) здесь не применяются, вердикта «проходит / не проходит» нет.

## Что куплено и сколько стоило

- Баланс DataForSEO: **$23,7172 до → $22,9709 после. Потрачено $0,7463** ✅ (каждый вызов — строка в `spend.log`; одобрено ≈$1, потолок $1,50).
- Подсказки (DataForSEO Labs, США): 22 зерна, до 200 строк на зерно — $0,4308.
  Почти ничего нового не дали (по $0,012): `chatgpt new chat` (1 новая фраза), `chatgpt notebooklm` (3), `chatgpt epub` (4), `backup chatgpt` (4).
- Объёмы Google Ads: **одна задача США + одна мир**, 910 ключей, 24 месяца (11.2024 → 10.2026) — $0,18.
- Сложность ключа (KD DataForSEO), США: одна задача, 846 ключей с объёмом — $0,1135. Число вернулось только у 246 ключей: у остальных
  в базе DataForSEO KD нет, а платят за отправленный ключ.
- Выдачи Google США (desktop, верхние 10): 11 штук — $0,022.
- Бесплатно: перепись стора (68 поисков, 259 карточек), разворот ссылок выдачи (DataForSEO теперь отдаёт ссылки обёрткой
  `google.com/goto` — настоящий адрес взят из перенаправления Google).
- Взято готовым, не покупал: подсказки `chatgpt to google docs` (11.10) и `chatgpt to claude` (22.09); выдачи `chatgpt to markdown`,
  `chatgpt to google docs`, `save chatgpt chat` (11.10); перепись стора 11.10 (Word, Docs, Markdown, Notion, PDF, «экспорт чата», печать).

## Как считал

- Среднее в месяц — за 12 месяцев **ноябрь 2025 → октябрь 2026**. «Мир» — запрос без страны и без языка.
  11.10 «мир» снимался с английским языком — эти цифры с нынешними напрямую не сравнивать.
- Перестановки слов схлопнуты до любых сумм (110 ключей). Одинаковый ряд за 24 месяца + та же цена клика + тот же индекс
  конкуренции = одна группа Google Ads, в сумме один раз (ещё 12 ключей, например `chatgpt export` = `chatgpt exporter`,
  `export chatgpt conversation` = `…conversations`).
- Шум отсеян до покупки: 544 фразы из 1 462 со словами цели, но про другое (загрузить PDF в ChatGPT, ChatGPT внутри Word,
  хранит ли ChatGPT чаты, скачать само приложение…). Каждая с причиной и объёмом Labs — в `kandidaty.csv`; правила — `pravila.py`.
- «Неясно» — голое «chatgpt + слово» без глагола (`chatgpt word`, `chatgpt notion`): в сумму группы не входит, показано рядом.
  Четыре самых крупных проверены выдачей — там в основном другой смысл (ниже).
- «Переход» — `switch from chatgpt to claude` и похожие (решение перейти, а не перенос данных): тоже рядом, не в сумме.
- KD DataForSEO — только для порядка, открытой дверь по нему не называю (Semrush ≈ 0,84·DFS + 26; DFS 0–9 бывает Semrush 12–50).

## Ловушки в рядах (проверено на этих данных)

- **Ступеньки ноября 2025 здесь нет** ✅. Из 104 ключей с объёмом ≥50 в ноябре 2025 удвоились 2. Правило (ноябрь ≥ ×2 к октябрю,
  ноябрь–январь ≥ ×2,5 к августу–октябрю, уровень держится) не сработало ни на одном ключе. Единственный заметный ноябрьский
  рост — `switch from chatgpt to gemini` (10–20 → 50–140) — совпадает с выходом Gemini 3 🔶.
- **Общая волна марта 2026** ✅: в марте выросли ×2 и больше 31 ключ из 135, в апреле упали 66 из 208. Это переезд к Claude
  (и немного к Gemini); он же поднял «экспорт данных».
- **Октябрь 2026, слово extension** ✅: у всех 13 запросов со словом extension, где в сентябре было ≥50, октябрь ниже сентября
  (медиана ×0,14); у 10 из них — в три раза и больше, вместе 2 130 → 170. Остальные крупные ключи в октябре выросли (медиана ×1,23).
  Причина ⬜. Последний месяц у таких ключей под вопросом — в `keys.csv` помечено; групповые ряды Word, PDF и «экспорта чата»
  в октябре занижены этим провалом.

## Таблица по группам

Сумма схлопнутых ключей, среднее в месяц за 12 мес, ✅. «Начало → конец» — среднее первых трёх месяцев (ноя–янв) и последних
трёх (авг–окт). «Имена чужих расширений» — уже внутри суммы (ищут конкретный продукт по имени). «Рядом» — не в сумме.

| цель (как в keys.csv) | блок | ключей | США | мир | США: начало → конец (пик) | год назад, США | имена чужих расширений | рядом, не в сумме | стор, главная дверь |
|---|---|---|---|---|---|---|---|---|---|
| Чат в файл, формат не назван | наши двери | 82 | 6 172 | 17 183 | 5 840 → 5 510 (мар.26 8 580) | 4 626 | 10 | неясно 392 | `chatgpt exporter` занято лидером; `export chatgpt conversation` — наша |
| **Claude** | обратно в ИИ | 115 | **5 699** | 13 730 | 60 → 3 293 (мар.26 27 320) | 2 | 0 | переход 638 | открыто (держатели ≤262 юз, 1 яз) |
| PDF и печать | наши двери | 117 | 5 622 | 24 444 | 7 390 → 4 157 (янв.26 8 100) | 6 142 | 1 783 | неясно 367 | `chatgpt to pdf` занято лидером |
| **Word** | форматы | 115 | **2 457** | 10 172 | 1 717 → 2 137 (июл.26 3 900) | 1 494 | 1 388 | неясно 230 | `chatgpt to word` занято; `chatgpt to docx` открыто |
| **Бэкап и история** | бэкап | 47 | **1 284** | 2 934 | 527 → 1 280 (мар.26 3 390) | 262 | 0 | неясно 869 | открыто (держатели ≤1 000 юз, 1 яз) |
| Новый чат | обратно в ИИ | 21 | 573 | 1 688 | 643 → 737 (окт.26 920) | 864 | 0 | неясно 38 | открыто, держателей нет |
| Google Docs | форматы | 39 | 520 | 1 126 | 557 → 433 (мар.26 750) | 539 | 71 | неясно 88 | открыто (держатель 10 000 · 22 яз · 1 380) |
| Markdown | форматы | 30 | 498 | 1 358 | 503 → 433 (мар.26 710) | 269 | 0 | неясно 72 | открыто (держатель 9 000 · 1 яз) |
| Gemini | обратно в ИИ | 23 | 388 | 1 026 | 180 → 310 (мар.26 990) | 5 | 0 | переход 76, неясно 23 | открыто, держателей нет |
| Картинка и скриншот | форматы | 14 | 177 | 440 | 243 → 130 (ноя.25 280) | 124 | 14 | неясно 268 | открыто (держатель 2 000 · 1 яз) |
| Другой аккаунт ChatGPT | бэкап | 8 | 132 | 385 | 170 → 130 (янв.26 230) | 123 | 0 | неясно 13 | ⬜ не проверял |
| Таблицы: Excel, CSV, Sheets | форматы | 30 | 128 | 388 | 163 → 113 (ноя.25 180) | 291 | 0 | неясно 58 | открыто |
| Notion | форматы | 14 | 103 | 667 | 133 → 77 (фев.26 150) | 355 | 7 | неясно 107 | открыто (держатели 3 000 · 5 яз; 7 000 · 18 яз) |
| Память ChatGPT (адресат не назван) | обратно в ИИ | 5 | 102 | 288 | 30 → 90 (мар.26 330) | 20 | 0 | неясно 11 | открыто, держателей нет |
| Текст (txt) | форматы | 10 | 77 | 207 | 57 → 100 (окт.26 120) | 15 | 0 | неясно 47 | открыто, держателей нет |
| Несколько форматов (имена расширений) | форматы | 3 | 48 | 99 | 10 → 33 (май.26 180) | 9 | 42 | — | — |
| PowerPoint и Canva | форматы | 8 | 37 | 128 | 40 → 40 | 64 | 0 | — | ⬜ не проверял |
| Obsidian | форматы | 5 | 36 | 157 | 23 → 40 | 24 | 0 | неясно 160 | открыто, держателей нет |
| JSON | форматы | 5 | 32 | 48 | 30 → 37 | 18 | 0 | неясно 40 | открыто, держателей нет |
| HTML | форматы | 5 | 15 | 30 | 17 → 17 | 18 | 0 | неясно 79 | открыто |
| EPUB и Kindle | форматы | 6 | 2 | 7 | 3 → 0 | 6 | 0 | неясно 9 | открыто |
| NotebookLM | обратно в ИИ | 4 | 0 | 0 | 0 → 0 | 0 | 0 | неясно 58 | открыто, держателей нет |

«Открыто» — по закону занятости ниже: держателя с теми же словами нет или он не оптимизирован.

По блокам (без соседей), США / мир, ✅:
- Наши двери (экспорт чата + PDF): **11 794 / 41 627**; год назад 10 768 в США.
- Обратно в ИИ (Claude, Gemini, NotebookLM, новый чат, память): **6 762 / 16 732**; год назад ≈890. Ряд США по месяцам:
  930 · 870 · 940 · 2 940 · **29 270** · 13 730 · 8 050 · 6 000 · 5 130 · 4 150 · 4 030 · 5 110.
- Форматы и программы (все файловые цели вместе): **4 130 / 14 828**; год назад 3 227. Ряд: 3 460 · 3 380 · 3 650 · 3 890 · 4 940 ·
  4 560 · 5 240 · 4 090 · 5 580 · 4 310 · 3 850 · 2 610 (октябрь занижен провалом extension).
- Бэкап всей истории (бэкап + другой аккаунт): **1 416 / 3 319**; год назад 385. Ряд: 570 · 720 · 800 · 1 590 · 3 540 · 1 820 ·
  1 480 · 1 140 · 1 100 · 1 510 · 1 170 · 1 550.
- Соседи, не наша цель (выгрузка чатов других ИИ): `ai chat exporter` 436 / 2 200, `export claude chat` 380 / 1 245 (растёт:
  110 → 590), `export gemini chat` 258 / 964.

## Самые крупные ключи по группам

Формат строки: ключ — США / мир · KD DataForSEO · 12 месяцев США (ноя.25 → окт.26) · тренд. Полный список — `keys.csv`.

### Обратно в ИИ
- **Claude** — волна марта 2026, сейчас ≈3 300 в месяц на всю группу (август–октябрь), в октябре чуть вверх (2 890 → 3 790).
  - `how to transfer chatgpt to claude` — 534 / 935 · KD ⬜ · 0 0 0 140 2400 1600 720 480 390 260 210 210
  - `transfer chatgpt to claude` — 508 / 1 033 · KD 3 · 0 0 20 140 2900 1000 590 480 320 210 170 260
  - `import chatgpt to claude` — 438 / 1 041 · KD 0 · 0 10 20 140 2400 880 590 320 260 210 170 260
  - `export chatgpt to claude` — 393 / 898 · KD 5 · 0 0 20 210 1600 880 590 390 390 210 170 260
  - рядом, не в сумме: `switch from chatgpt to claude` (= `switching…`) 431 / 916, `should i switch from chatgpt to claude` 186 / 330
- **Gemini** — та же волна, в 15 раз меньше.
  - `import chatgpt to gemini` — 66 / 192 · KD ⬜ · 10 30 20 140 210 110 50 50 40 50 40 40
  - `export chatgpt to gemini` — 48 / 140 · KD 2 · 10 40 40 70 110 70 50 50 30 30 30 50
  - `transfer chatgpt to gemini` — 44 / 126 · KD ⬜ · 20 30 40 70 140 70 40 30 20 30 20 20
- **Новый чат** — за год ровно, но с июня растёт (310 → 920 в октябре).
  - `chatgpt maximum conversation length` — 99 / 372 · KD 2 · 320 110 50 50 90 90 20 40 90 110 110 110
  - `chatgpt conversation too long` — 75 / 179 · KD 0 · 30 20 70 20 20 20 30 40 110 110 170 260 (×4,5)
  - `chatgpt conversation limit` — 71 / 196 · KD 10 · 110 90 90 90 110 70 30 30 40 50 70 70
  - `how to continue chatgpt conversation in new chat` — 55 / 179 · KD 0 · 70 90 50 70 50 90 50 30 50 30 30 50
- **NotebookLM** — 0 по всем фразам с глаголом. Рядом: `chatgpt notebooklm` 51 / 912 (по словам — скорее сравнение 🔶).
- **Память ChatGPT** — `chatgpt export memory` 32 / 108, `how to export chatgpt memory` 28 / 82; волна марта.

### Бэкап всей истории
- `chatgpt export data` (= `chatgpt data export`, `export chatgpt data`…) — 234 / 625 · KD 2 · 90 140 140 260 480 320 260 210 170 210 210 320
- `how long does chatgpt data export take` — 106 / 178 · KD 0 · 0 10 10 140 480 170 110 70 70 70 50 90
- `how to export chatgpt data` — 85 / 160 · KD 1 · 20 30 30 70 210 110 110 70 70 70 90 140
- `chatgpt data export not working` — 73 / 164 · KD 0 · 20 30 10 110 260 140 90 50 30 40 50 50
- рядом, не в сумме: `chatgpt archive` 743 / 2 667 — по выдаче это функция «Архив» в самом ChatGPT, не бэкап; `chatgpt backup` 50 / 150.
- Другой аккаунт: `how to transfer chatgpt data to another account` 48 / 137, `how to transfer chatgpt chats to another account` 27 / 97.

### Форматы
- **Word** — 2 457 в США, но 1 388 из них ищут чужое расширение по имени («ChatGPT to Word or PDF», thinksolv, 100 000 юз).
  Без имён ≈1 070: из них 498 — перенести кусок (таблицу, формулу) или починить форматирование после вставки, 180 — «… extension».
  - `chatgpt to word or pdf chrome extension` — 746 / 2 070 · KD 0 · 320 320 480 480 1000 1300 1600 1000 1300 720 390 40 (имя)
  - `chatgpt to word or pdf extension` — 562 / 1 452 · KD 0 · 90 90 110 90 480 480 1000 880 1600 1000 880 50 (имя)
  - `chatgpt to word extension` — 112 / 563 · KD 0 · 70 70 70 110 260 110 140 110 170 110 90 30
  - `chatgpt to word` — 73 / **1 592** · KD 0 · 90 70 50 70 70 70 50 70 50 90 90 110 (в мире в 22 раза больше, чем в США)
  - рядом: `chatgpt word` 136 / 1 711
- **Google Docs**
  - `chatgpt to google docs extension` — 96 / 161 · KD 22 · 50 70 90 90 70 70 90 110 260 170 70 10
  - `chatgpt to google docs` — 39 / 188 · KD 0 · 50 70 40 50 70 50 30 10 10 40 20 30
- **Markdown**
  - `chatgpt to markdown extension` — 93 / 144 · KD 0 · 20 30 50 320 260 140 50 30 50 70 90 10
  - `chatgpt to markdown` — 84 / 474 · KD 0 · 70 90 90 90 140 110 90 50 70 50 70 90
  - `export chatgpt conversation to markdown` — 24 / 66
- **Картинка** — `chatgpt screenshot extension` 91 / 145 (падает: 210 → 10), `chatgpt long screenshot exporter` 14 (имя расширения),
  `chatgpt to image` 12 / 114. Рядом: `chatgpt screenshot` 235 / 786 — по выдаче в основном «дать скриншот ChatGPT».
- **Таблицы** — всё по 10: `chatgpt to excel` 11 / 94, `how to copy table from chatgpt` 10 / 48, `chatgpt to google sheets` 10 (KD 45).
  Год к году −56 %. Таблицы в Word и Docs посчитаны в Word и Docs.
- **Notion** — `chatgpt to notion` 35 / **493**, падает (50 → 10); рядом `chatgpt notion` 107 / 838.
- **Текст** — `how to export chatgpt conversation as text` 37 / 98 (растёт: 10 → 50–70), `chatgpt to txt` 12.
- **Obsidian** — `chatgpt to obsidian` 21 / 102; рядом `obsidian chatgpt` 141 / 1 235 — по выдаче это плагины ChatGPT внутри Obsidian.
- **JSON** — `chatgpt conversations json` 11, `export chatgpt conversation to json` 9. **HTML** — `chatgpt to html` 10.
- **EPUB и Kindle** — ≈0. **PowerPoint и Canva** — 37 на всё.

### Наши двери (для сравнения)
- `chatgpt export` (= `chatgpt exporter`) — **1 741 / 6 508** · KD 15 / 8 · 590 1300 1900 2400 2900 1900 1600 1600 1900 1900 1600 1300 —
  год к году ×4,6 (было 381). Самый крупный ключ замера. «ChatGPT Exporter» — ещё и имя лидера ниши, часть поиска навигационная 🔶.
- `export chatgpt conversation` (= `…conversations`) — 442 / 1 325 · KD 8 · ровно (390 … 590); имя занято нами.
- `chatgpt to pdf` — 368 / **4 950** · KD 0 · ровно в последний год, год к году −45 %.
- `how to save chatgpt conversation as pdf` — 238 / 638 · KD 0 · растёт: 90 → 590.
- `save chatgpt conversation` (= `…conversations`) — 80 / 187 · KD 8 · ровно.
- Падают: `chatgpt to pdf extension` 1 300 → 30, `how to save chatgpt conversation` 480 → 320. Имена чужих PDF-расширений:
  `chatgpt print and save extension` 1 324 (пик 3 600 в янв–фев, в октябре 10), `chatgpt to pdf by pdfcrowd` 90.

## Что показывает выдача Google США (головные ключи)

Источник — DataForSEO live, Google США, desktop; дата у каждого. «По делу» — страница делает то, что сделала бы наша выгрузка.
Полные списки со ссылками — `serp.md`.

- **`chatgpt export`** (16.11). ИИ-обзор сверху — родная выгрузка всего архива (Settings → Data controls → Export, ссылка письмом).
  По делу 8 из 8: один чат в файл — 5 ([Reddit: экспорт одного разговора](https://www.reddit.com/r/ChatGPT/comments/1j2d71i/how_to_export_the_data_of_a_specific_conversation/),
  [YouTube: в PDF и Word](https://www.youtube.com/watch?v=3rCVXWIthDc), [exportgpt.pro](https://exportgpt.pro/), [YouTube](https://www.youtube.com/watch?v=ZDLkrB9O06Y),
  [aichatexport.app — приложение iPhone](https://www.aichatexport.app/)); архив целиком — 2 ([andrewhoog.com](https://www.andrewhoog.com/posts/exporting-my-chatgpt-chats/),
  [Forbes: «мусор, который получаешь при экспорте»](https://www.forbes.com/sites/barrycollins/2026/03/03/heres-the-mess-you-receive-if-you-export-your-chatgpt-data/));
  CLI-инструмент — 1 ([GitHub](https://github.com/FdezRomero/chatgpt-exporter)). Софт 3 из 8. Похожие запросы: export chat to PDF, export extension, export Markdown.
- **`chatgpt export data`** (16.11). ИИ-обзор — родная выгрузка. По делу 7 из 7: родная выгрузка архива — 4
  ([Reddit: «выгрузка идёт долго»](https://www.reddit.com/r/ChatGPT/comments/1rh779n/data_export_taking_a_long_time/), andrewhoog, Facebook, форум OpenAI);
  инструменты выгрузки чатов — 3 ([gist](https://gist.github.com/ocombe/1d7604bd29a91ceb716304ef8b5aa4b5), [chatgptexporter.com](https://www.chatgptexporter.com/en),
  [Kaggle](https://www.kaggle.com/writeups/salaquy/i-finally-found-the-best-way-to-export-chatgpt-con)).
  Обсуждения на странице: «умоляю, выгрузите историю на этой неделе», «выгрузка приходит через несколько дней».
- **`chatgpt to word`** (16.11). ИИ-обзор начинает с официальной надстройки ChatGPT для Word (ChatGPT внутри Word), потом —
  расширение «ChatGPT to Word or PDF». По делу 7 из 9: [ChatGPT2Word](https://aiaxio.com/tools/ai/chatgpt2word/),
  [Reddit: вставка с форматированием](https://www.reddit.com/r/ChatGPT/comments/1nfo8nb/how_to_paste_from_chatgpt_into_word_or_google/),
  [YouTube: таблицы в Word](https://www.youtube.com/watch?v=W014fh-YFXY), [YouTube: чат в PDF/Word](https://www.youtube.com/shorts/Ok1-6dIO7Fo),
  [Skool](https://www.skool.com/chatgpt/chat-gpt-to-word), [STEM Doc](http://sugarandrice.co/blog/chatgpt-ai-text-to-word-stem),
  [YouTube: без потери форматирования](https://www.youtube.com/watch?v=sxTTt5dBpe8). Не по делу 2 (ChatGPT сам делает документ). Софт 2 из 9.
- **`transfer chatgpt to claude`** (16.11). ИИ-обзор — встроенный импорт памяти в Claude (Настройки → Capabilities → Memory) или
  выгрузка всего архива ChatGPT 🔶 (слова обзора). По делу 8 из 8, все — гайды: [Reddit r/Anthropic](https://www.reddit.com/r/Anthropic/comments/1rh18pj/how_do_i_migrate_everything_over_from_openais/),
  [Artificial Corner](https://artificialcorner.com/p/switch-to-claude), [PCMag](https://www.pcmag.com/explainers/switching-to-claude-this-easy-trick-brings-your-chatgpt-memory-with-you),
  [Lifehacker: «импорт данных ChatGPT в Claude бесплатно»](https://lifehacker.com/tech/you-can-now-import-your-chatgpt-data-to-claude-for-free), Forbes AU, LinkedIn, 2 ролика YouTube. Софт 0.
- **`import chatgpt to gemini`** (16.11). По делу 8 из 8; половина — новости о встроенном импорте чатов в Gemini 🔶
  ([Mashable](https://mashable.com/article/how-to-import-chats-gemini), [Android Authority](https://www.androidauthority.com/gemini-import-memory-and-chats-3651158/), Reddit, Facebook),
  остальное — гайды ([gend.co](https://www.gend.co/blog/import-chat-history-gemini), YouTube, LinkedIn, PDF университета). Софт 0.
- **`how to continue chatgpt conversation in new chat`** (16.11). ИИ-обзор — встроенная функция ChatGPT «Branch in new chat»
  (новая ветка уносит контекст) 🔶. По делу 3–4 из 7 ([Reddit](https://www.reddit.com/r/ChatGPT/comments/160i3aq/can_you_prompt_chatgpt_to_continue_from_another/),
  [Prompt Architects](https://prompt-architects.com/blog/tag/how-to-restart-a-chatgpt-conversation), [Medium](https://medium.com/@inchristiely/how-to-move-your-ai-conversations-to-a-new-ai-assistant-d757e1caa954), Guideflow — частично). Софт 0.
- **`chatgpt screenshot`** (16.11, «неясно»). По делу 2 из 8 — расширения-скриншотеры
  ([ChatGPT Screenshot Ex](https://chromewebstore.google.com/detail/chatgpt-screenshot-ex/cdhbhenafofcgljodakoeglmlnboeijf), Softonic).
  Остальное — как дать скриншот ChatGPT (3) и картинки интерфейса (3). ИИ-обзор — тоже про скриншот В ChatGPT.
- **`chatgpt to notion`** (16.11). ИИ-обзор начинает с «сохранить разговоры в Notion расширением». По делу 3 из 7
  ([Chat to Notion](https://chromewebstore.google.com/detail/chat-to-notion/oojndninaelbpllebamcojkdecjjhcle), [YouTube](https://www.youtube.com/watch?v=_619HgP98pY),
  [Reddit r/Notion](https://www.reddit.com/r/Notion/comments/1kj7hvf/import_chatgpt/)); 4 — интеграция и сравнение Notion AI.
- **`chatgpt archive`** (16.11, «неясно»): 6 из 7 — функция «Архив» в ChatGPT ([справка OpenAI](https://help.openai.com/en/articles/8809935-deleting-and-archiving-chats-in-chatgpt)). Не бэкап.
- **`obsidian chatgpt`** (16.11, «неясно»): 7 из 8 — плагины ChatGPT внутри Obsidian; 1 — сохранить разговоры.
- **`chatgpt pdf`** (16.11, «неясно», в мире 10 942): 1 из 9 — выгрузка чата в PDF; остальное — загрузить PDF в ChatGPT.
- Взято из 11.10 (DataForSEO live, 11.10.2026): `chatgpt to markdown` — по делу 9 из 9, софт 5 из 9;
  `chatgpt to google docs` — по делу 4 из 8 (перенести ответ или таблицу), 4 — ChatGPT внутри Docs; `save chatgpt chat` — по делу 8 из 8, софт 2 из 8.

## Стор: занято ли имя

Закон: занято, только если имя (или часть имени) из тех же слов **и** описание > 3 000 знаков **и** языков > 30. Иначе держатель
не оптимизирован — дверь открыта. Новые двери — перепись 16.11 (68 поисков US-витрины, 4–8 формулировок на дверь, 259 карточек;
`census.csv`, `zanyatost.csv`); старые — перепись 11.10. Прибор сверен ✅: лидер ниши 200 000 · 34 яз · 10 844 знаков — как 11.10;
наш ExportGPT 962 · 51 · 3 722 — языки и описание как 11.10, пользователи — как в нашем STATE (962).

- **Ни одна новая дверь не занята** ✅ (16.11):
  - Obsidian, Gemini, NotebookLM, новый чат, память, txt, JSON — держателя с теми же словами нет ни у одной формулировки.
  - Claude: `chatgpt to claude` (Prompt Repo · 262 юз · 1 яз), `transfer chatgpt to claude` (Claude to Chatgpt transfer · 162 · 1 яз) —
    держатели не оптимизированы; `export / import / move chatgpt to claude`, `chatgpt claude migration` — держателя нет.
  - Бэкап: `chatgpt backup` (ChatGPT Backup · 1 000 · 1 яз · 5 134), `chatgpt bulk export` (Bulk ChatGPT Export · 1 000 · 1 яз),
    `export all chatgpt chats` (ChatGPT Chat Exporter · 510 · 1 яз), `chatgpt data export` (5 юз) — не оптимизированы;
    `backup chatgpt chats`, `chatgpt history export`, `download all chatgpt conversations` — держателя нет.
  - Картинка: `chatgpt screenshot` (chatGPT screenshot · 2 000 · 1 яз · 532) — не оптимизирован; остальные пять — держателя нет.
  - Таблицы: `chatgpt table export` (153 юз) — не оптимизирован; `chatgpt to excel`, `chatgpt to csv` и ещё три — держателя нет.
  - HTML: `save chatgpt as html` (48 юз) — не оптимизирован, остальные — держателя нет. EPUB: держателя-выгрузчика нет.
- Рядом стоят (имя из других слов, справка): Save ChatGPT to Obsidian markdown file · 5 000 · 13 яз · 5 681; AI Chat Exporter:
  Transfer, Save & Continue ChatGPT, Claude, Gemini… · 6 000 · 1 яз; Continue AI · 958; ChatMigrate · 371; ChatBridge AI (продолжить
  в новом чате) · 96; NotebookLM Web Importer · 300 000 (импорт веб-страниц, не ChatGPT); ChatGPT Bulk Delete, Chat Export, Folders… ·
  10 000 · 54 яз (оптимизирован, но имя про другое).
- Двери 11.10: **заняты** `chatgpt to pdf`, `chatgpt exporter / export chatgpt / chatgpt export` (лидер 200 000), `chatgpt to word`
  (ChatGPT to Word · 1 000 · 55 яз · 4 895), `export chatgpt conversation` (мы). **Открыты** `chatgpt to google docs` (держатель 10 000 ·
  22 яз · 1 380), `chatgpt to markdown` (9 000 · 1 яз), `chatgpt to notion` (3 000 · 5 яз), `save chatgpt to notion` (7 000 · 18 яз ·
  5 243), `chatgpt to docx`, `export chatgpt to word`, `chatgpt to md`, `save chatgpt conversation`, `print chatgpt conversation`.
- По каждому ключу — колонка `store_door_status` в `keys.csv` (имя сравнивается без слов extension, chrome и т. п.; вопросы «how to…»
  в имя не идут).

## Чего здесь нет

- Semrush (канонные числа объёма и KD) не снимал ⬜. KD только DataForSEO, и у 600 из 846 ключей с объёмом его нет вовсе
  (KD 11.10 и 16.11 совпали у 25 из 27 общих ключей — ноябрьского занижения у DataForSEO здесь не видно ✅).
- Выдачи — 11 своих и 3 из 11.10. Смысл остальных ключей размечен по словам 🔶 (`kandidaty.csv`, `pravila.py`).
- Хвосты сверх 200 строк на зерно не куплены: `export chatgpt` (всего 299), `chatgpt pdf` (358), `chatgpt word` (282), `save chatgpt` (210) —
  остаток по 10–20 в месяц.
- Перепись стора по «другому аккаунту» и PowerPoint/Canva не делал ⬜. Стор-поиск даёт ≈10 карточек; держатель дальше 10-го места
  мог не попасть (поэтому 4–8 формулировок). Двери Word, Docs, Markdown, Notion, PDF — по переписи 11.10 (месяц назад).
- Деньги (кто за какой формат берёт плату) здесь не смотрел ⬜; из 11.10: у лидера PDF платный сверх лимита, MD/TXT/JSON/CSV бесплатны.
- Встроенные функции платформ («Branch in new chat» в ChatGPT, импорт памяти в Claude, импорт чатов в Gemini) — по ИИ-обзору и
  заголовкам новостей 🔶, в самих продуктах не проверял.
- Почему в октябре 2026 провалились запросы со словом extension ⬜.
- Обратное направление (Claude → ChatGPT) и шум не мерил Google Ads — только объёмы Labs в `kandidaty.csv`.
- Не мерил: «файл, который сделал сам ChatGPT, не скачивается» (`can t download pdf from chatgpt` и ещё 50 фраз по 10–30 в Labs) — рядом с
  нашей нуждой, но про другое 🔶.
- Цели людей (зачем выгружают) — в соседнем разборе `research/intent-2026-11/` (архив и бэкап — чаще всего, потом перенос в
  программы и «продолжить в новом чате или другом ИИ»); сюда не сливал.

## Как повторить

Скрипты в этой папке; сырьё кэшируется в `raw/` — повтор бесплатный, удалить файл = купить вызов заново.
1. `python3 -I run.py balance` — баланс (бесплатно).
2. `python3 -I run.py suggest` — подсказки по 22 зёрнам (≈$0,43; зёрна и фильтры — в начале `run.py`).
3. `python3 -I run.py keys` — список ключей и шум → `kandidaty.csv` (правила — `pravila.py`, ручные ключи — `MANUAL` в `run.py`).
4. `python3 -I run.py volume` — две задачи Google Ads, США и мир (≈$0,18).
5. `python3 -I run.py kd` — KD одной задачей (≈$0,012 + $0,00012 за ключ).
6. `python3 -I run.py serp "ключ" …` ($0,002 за ключ), затем `python3 -I run.py serp_md` → `serp.md` с настоящими адресами.
7. `python3 -I census.py all` — перепись стора ($0) → `census.csv`, `zanyatost.csv`, `zanyatost_po_klyucham.json`.
8. `python3 -I analyze.py --print` → `keys.csv`, `svod.json`.

Файлы: `keys.csv` (key, group, us_avg, world_avg, us_12_months, trend_note, kd_dfs, store_door_status, notes) · `kandidaty.csv`
(все 1 462 фразы, шум с причиной) · `serp.md` · `census.csv` · `zanyatost.csv` · `svod.json` · `spend.log` · `raw/` (ответы API
как пришли + тела запросов) · `census/` (сырьё стора).
