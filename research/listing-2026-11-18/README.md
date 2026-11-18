# Ключи для листинга ExportGPT — Main и Extra (черновик 18.11.2026)

Тиры: ✅ измерено · 🧮 выведено · 🔶 догадка (по словам ключа, без выдачи) · ⬜ нет данных.

## Вопрос

- Шаг 1 канона для текста стора: собрать около 30 ключей — 15 в **Main** («ключ из названия и его вариации с хвостами») и 15 в
  **Extra** («более дальние ключи на тему продукта… из других слов») — `app-studio/knowledge-base/module-2/2.1-meta-cws.md:35–38`.
- Название не меняем (слово автора 18.11) — `Export ChatGPT Conversation`.
- Продукт теперь умеет: PDF, Word, Markdown, Google Docs, Claude, Obsidian, Notion; весь чат или выбранные блоки; формулы, код,
  таблицы, картинки. Ключи берём под то, что продукт делает на самом деле.
- Эта таблица — сначала автору (порядок «таблица → слово автора → текст»), тексты пишутся после.

## Откуда цифры

- Только то, что уже куплено 16.11 — `../novye-vygruzki-2026-11-16/` (Google Ads через DataForSEO, США и мир). **Потрачено $0.**
- «США, мес» — среднее за 12 месяцев ноябрь 2025 → октябрь 2026; «сейчас» — среднее августа–октября 2026; «год к году» — к тем же
  12 месяцам годом раньше (ноя.24 → окт.25); «новый» — год назад почти не искали.
- KD — DataForSEO от 16.11 (где нет — от 11.10), только для порядка. Месяцы Semrush (август–октябрь, правило 18.11) не сняты — 🔶.
- Склейки: одна группа Google Ads или та же фраза в другом порядке слов — одна строка, объём один раз. Варианты из скобок тоже можно
  вписывать в текст: это разные формулировки одного спроса.
- Сборка — `sobrat.py` (без сети) → `kluchi.csv`.

## Main — 15 (ключ названия и его вариации)

| # | ключ | США, мес (12 мес) | США сейчас (авг–окт) | мир, мес | год к году | KD DFS | кто ищет | зачем |
|---|---|---|---|---|---|---|---|---|
| 1 | `export chatgpt conversation` (= export chatgpt conversations · chatgpt export conversation(s) · chatgpt conversation export) | 442 | 487 | 1325 | +0 % | 8 | ищут именно выгрузку чата — ключ нашего названия, держим его мы (карточка 16.11) 🔶 по словам | ключ названия: точное вхождение 7–10 раз (канон 2.1.4) |
| 2 | `chatgpt export` (= chatgpt exporter · export chatgpt) | 1741 | 1600 | 6508 | +357 % | 15 | выдача 16.11 ✅: 8 из 8 по делу, 5 — один чат в файл, 2 — архив целиком; «ChatGPT Exporter» — ещё и имя лидера ниши 🔶 | самый крупный ключ замера; голова названия — вариация без conversation |
| 3 | `how to export chatgpt conversation` (= how to export chatgpt conversations · chatgpt how to export conversation) | 335 | 247 | 681 | +4 % | 7 | спрашивают, как сделать 🔶 по словам | хвост ключа названия; вопрос → FAQ |
| 4 | `chatgpt export extension` | 238 | 180 | 587 | +170 % | 0 | ищут расширение 🔶 по словам | вариация с хвостом extension |
| 5 | `chatgpt export chat` (= chatgpt export chats · export chatgpt chat · chatgpt chat export) | 186 | 183 | 982 | +60 % | 9 | выгрузка чата; chat = conversation словами людей 🔶 | вариация: chat вместо conversation |
| 6 | `how to export a chatgpt conversation` | 175 | 213 | 337 | +52 % | ⬜ | спрашивают, как сделать 🔶 | хвост ключа названия; вопрос → FAQ |
| 7 | `how to export chatgpt chat` | 157 | 183 | 806 | +64 % | 8 | спрашивают, как сделать 🔶 | вариация chat; вопрос |
| 8 | `export chatgpt conversation to pdf` | 156 | 120 | 537 | -19 % | 0 | чат в PDF 🔶 по словам | хвост: PDF |
| 9 | `how to export chatgpt conversation to pdf` | 143 | 213 | 176 | +96 % | 0 | спрашивают, как получить PDF 🔶 | хвост: PDF; вопрос |
| 10 | `export chatgpt to claude` | 393 | 213 | 898 | новый (год назад ≈0) | 5 | переезд в Claude: выдача «transfer…» 16.11 ✅ — гайды переезда целиком (память, история), софта 0; наш перенос — по одному чату 🔶 | вариация с хвостом to claude — новое место 1.2.10 |
| 11 | `how to export chatgpt conversation as pdf` (= how to export chatgpt conversations as pdf (10)) | 78 | 113 | 286 | -1 % | 1 | спрашивают, как получить PDF 🔶 | хвост: as pdf; вопрос |
| 12 | `can you export chatgpt conversations` | 69 | 43 | 152 | +60 % | 6 | сомневаются, можно ли 🔶 | хвост; вопрос → FAQ |
| 13 | `how to export chatgpt conversation as text` | 37 | 53 | 98 | новый (год назад ≈1) | ⬜ | спрашивают про текст 🔶 | хвост: text — Markdown это текст |
| 14 | `export chatgpt conversation chrome extension` | 34 | 10 | 62 | -43 % | 15 | ищут расширение 🔶 | хвост: chrome extension |
| 15 | `export entire chatgpt conversation` | 29 | 37 | 57 | +32 % | ⬜ | весь чат целиком 🔶 | хвост: entire — наш Whole chat |

Всего в Main ≈4213 поисков в месяц в США за год. По канону Main вписывается в полное описание 15–20 раз: половина — точный ключ
названия, половина — вариации с хвостами (`2.1-meta-cws.md:91`). Строки 1, 3, 6, 8, 9, 11–15 содержат все слова названия — это
«Broad Match» в смысле канона; строки 2, 4, 5, 7, 10 — голова названия (`chatgpt export`, `export chatgpt`) или `chat` вместо
`conversation`: так пишут люди, и спроса у них больше всего 🧮.

## Extra — 15 (другие слова, о том же продукте)

| # | ключ | США, мес (12 мес) | США сейчас (авг–окт) | мир, мес | год к году | KD DFS | кто ищет | зачем |
|---|---|---|---|---|---|---|---|---|
| 1 | `transfer chatgpt to claude` | 508 | 213 | 1033 | новый (год назад ≈0) | 3 | выдача 16.11 ✅: 8 из 8 — гайды переезда; ИИ-обзор — встроенный импорт памяти в Claude; софта 0 | Claude — самый большой новый спрос; честно: переносим разговор, не память |
| 2 | `how to save chatgpt conversation` (= how to save chatgpt conversations) | 392 | 300 | 772 | -35 % | 10 | спрашивают, как сохранить 🔶; выдача «save chatgpt chat» 11.10 ✅: 8 из 8 — сохранить или выгрузить чат | слово задачи save (не export) |
| 3 | `import chatgpt to claude` | 438 | 213 | 1041 | новый (год назад ≈0) | 0 | переезд в Claude 🔶 (как transfer) | Claude: слово import |
| 4 | `chatgpt to pdf` | 368 | 377 | 4950 | -45 % | 0 | чат в PDF 🔶 по словам (выдача «chatgpt pdf» — про другое, это не она) | главная функция: PDF |
| 5 | `how to save chatgpt conversation as pdf` | 238 | 443 | 638 | +45 % | 0 | спрашивают, как сохранить в PDF 🔶 | save + PDF; растёт |
| 6 | `how to download chatgpt conversation` | 238 | 160 | 395 | +4 % | 7 | спрашивают, как скачать 🔶 | слово задачи download |
| 7 | `how to download a chatgpt conversation` | 228 | 307 | 412 | +41 % | 6 | спрашивают, как скачать 🔶 | download; растёт |
| 8 | `print chatgpt conversation` | 120 | 107 | 232 | -10 % | 0 | хотят распечатать 🔶 | слово задачи print |
| 9 | `chatgpt to word extension` | 112 | 77 | 563 | +115 % | 0 | ищут расширение для Word 🔶 | Word |
| 10 | `chatgpt to google docs extension` | 96 | 83 | 161 | +153 % | 22 | ищут расширение для Google Docs 🔶 | Google Docs — новое место 1.3.0 |
| 11 | `chatgpt to markdown` | 84 | 70 | 474 | +25 % | 0 | выдача 11.10 ✅: 9 из 9 — чат в Markdown, софт 5 из 9 | Markdown |
| 12 | `save chatgpt conversation` (= save chatgpt conversations) | 80 | 77 | 187 | -21 % | 8 | сохранить чат 🔶 | save |
| 13 | `chatgpt to word` | 73 | 97 | 1592 | -3 % | 0 | выдача 16.11 ✅: 7 из 9 — перенести текст в Word без потери вида; ИИ-обзор начинает с надстройки ChatGPT для Word (другое) | Word; в мире в 22 раза больше, чем в США |
| 14 | `chatgpt to notion` | 35 | 17 | 493 | -65 % | 0 | выдача 16.11 ✅: 3 из 7 — сохранить чат в Notion расширением; 4 — интеграция и сравнение (другое) | Notion — новое место 1.3.0 |
| 15 | `chatgpt to obsidian` | 21 | 20 | 102 | +17 % | 0 | перенести в Obsidian 🔶 (выдачи нет; «obsidian chatgpt» — плагины внутри Obsidian, другое) | Obsidian — новое место 1.3.0; спрос маленький |

Всего в Extra ≈3031 в месяц в США. Здесь слова задач — save, download, print, transfer, import — и новые места: Word,
Google Docs, Markdown, Notion, Obsidian, Claude.

## Запас (если какой-то ключ не ляжет в текст)

- `how to transfer chatgpt to claude` — 534 в мес (сейчас 227), мир 935 · четвёртый ключ Claude — если не перегрузит текст
- `export chatgpt conversation to claude` — 29 в мес (сейчас 27), мир 103 · точный хвост названия
- `export chatgpt conversation to markdown` — 24 в мес (сейчас 20), мир 66 · точный хвост названия
- `export chatgpt conversation to word` — 17 в мес (сейчас 13), мир 49 · точный хвост названия
- `how do i export chatgpt conversations` — 28 в мес (сейчас 30), мир 54 · хвост названия
- `export chatgpt conversation extension` — 25 в мес (сейчас 33), мир 68 · хвост названия
- `download chatgpt chat` — 88 в мес (сейчас 113), мир 386 · KD DataForSEO 45 — самый высокий в таблице
- `chatgpt to markdown extension` — 93 в мес (сейчас 57), мир 144 · падает
- `how to save chatgpt chats` — 68 в мес (сейчас 70), мир 177 · save
- `chatgpt to google docs` — 39 в мес (сейчас 30), мир 188 · Google Docs
- `chatgpt to pdf extension` — 534 в мес (сейчас 70), мир 1583 · большой за год, но последние месяцы почти ноль — см. «сейчас»
- `save chatgpt chrome extension` — 242 в мес (сейчас 33), мир 349 · то же: почти ноль сейчас

## Что не взяли и почему

- `chatgpt pdf` (307 / 10 942) — выдача 16.11 ✅: почти вся про другое — загрузить PDF в ChatGPT.
- `chatgpt export data`, `chatgpt data export`, `how to export chatgpt data`, `export all chatgpt conversations` (234 / 199 / 85 / 48) —
  выдача 16.11 ✅: родная выгрузка всего аккаунта (Settings → Data controls). Мы выгружаем чат, не аккаунт — другое желание.
- `chatgpt archive` (743) — выдача 16.11 ✅: функция «Архив» внутри ChatGPT.
- `chatgpt to word or pdf chrome extension`, `chatgpt to word or pdf extension`, `chatgpt to word or pdf` (746 / 562 / 72) — имя
  чужого расширения (ChatGPT to Word or PDF, 100 000 юзеров): ищут его по имени.
- `chatgpt print and save extension` (1 324) и `chatgpt print and save` — тоже имя чужого расширения. ⚠️ Эта фраза стоит последней
  строкой в нашем нынешнем полном описании — в новом тексте её не должно быть.
- `chatgpt to pdf by pdfcrowd` — имя чужого расширения.
- `switch from chatgpt to claude` (431), `should i switch from chatgpt to claude` (186) — решение перейти, а не перенос данных.
- `obsidian chatgpt` (141 / 1 235) — выдача 16.11 ✅: плагины ChatGPT внутри Obsidian.
- голые `chatgpt word`, `chatgpt notion`, `chatgpt google docs`, `chatgpt markdown` (136 / 107 / 88 / 66) — без глагола неясно, чего
  хотят; самые крупные из таких, проверенные выдачей 16.11, — в основном про другое.
- Gemini (`import chatgpt to gemini` 66, `export chatgpt to gemini` 48) — места Gemini у нас нет.
- «Новый чат» (`chatgpt conversation too long`, `how to continue chatgpt conversation in new chat`) — выдача 16.11: встроенная
  ветка «Branch in new chat» 🔶; наш перенос в Claude это закрывает лишь частично.
- `chatgpt screenshot` (235) — выдача 16.11 ✅: про то, как дать скриншот ChatGPT; картинок мы не делаем.
- ключи «на iPhone», «по ссылке» (`chatgpt link to pdf`), «app» — телефон и ссылки шаринга, не наш путь.

## Важное для текстов (следующий шаг)

- **Слово extension:** в октябре 2026 у всех крупных ключей с этим словом провал (медиана ×0,14), причина ⬜ — поэтому у
  `chatgpt to pdf extension` за год 534, а сейчас 70. Год и «сейчас» показаны рядом.
- **Claude:** волна марта 2026 — за год в среднем 400–500 в месяц у каждого ключа, сейчас ≈213. Выдача ✅: люди переезжают
  целиком (память, история), софта в выдаче нет. Честная формулировка — «перенести этот разговор в Claude», не «перенести память».
- **Бренды** (Word, Google Docs, Notion, Obsidian, Claude) — только внутри фраз, не списком: отказ Keyword Spam 04.10 был за перечни.
  Правило Google — не больше 5 повторов ключа; канон хочет ключ названия 15–20 раз. Это противоречие держать в уме при Тургеневе.
- **В нынешнем тексте** (en, 3 723 знака): «works directly in your browser» — неправда для PDF (он делается на нашем сервере), правда
  теперь для Word, Markdown и передач; «focuses specifically on PDF… too many formats» — устарело.

## Пробелы и сколько стоит закрыть

- **Выдачи нет** у: `chatgpt to pdf`, `how to save chatgpt conversation`, `how to download chatgpt conversation`, `print chatgpt
  conversation`, `export chatgpt to claude`, `import chatgpt to claude`, `chatgpt to word extension`, `chatgpt to google docs extension`,
  `chatgpt to obsidian` — «кто ищет» у них 🔶. Снять: DataForSEO, выдача Google США ≈$0,002 штука → 9–10 выдач ≈ **$0,02**.
- **KD за август–октябрь** (правило 18.11) — не снят, есть только DataForSEO 16.11 (🔶). Для текста готового продукта KD не гейт.
  Снять: Semrush Keyword Overview с `date=` на 30 ключей × 3 месяца, руками в пробном Semrush автора — **$0**, если пробный жив
  (≈90 исторических запросов, лимит ≈45–80 в час).
- **Канон называет источник Main — Broad Match в Semrush;** у нас подсказки DataForSEO (на этом же листинге 07-11 они повторили Main и
  Extra автора из Semrush почти один в один) 🧮. Строго по канону — выгрузка Broad Match «export chatgpt conversation» из пробного
  Semrush, **$0** руками.

## Покрытие — что НЕ сделано

- Тексты конкурентов по нашим ключам не сравнивались (канон 2.1.8) — только разбор листингов 04.10.
- Объёмы — Google Ads (DataForSEO), не Semrush; у широких ключей DataForSEO бывает выше Semrush в 2–6 раз (сверка 07-11 🔶).
- Языки, кроме английского, не смотрел (это этап переводов).
