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

- Объёмы — то, что уже куплено 16.11 — `../novye-vygruzki-2026-11-16/` (Google Ads через DataForSEO, США и мир), $0.
- 18.11 докуплены 9 выдач Google США (DataForSEO, компьютер, английский, верхние 10) — для ключей, у которых выдачи не было:
  **$0,018**. Сводка — `serp.md`, сырьё — `raw/`, скрипт — `serp.py`. Потом KD DataForSEO на 43 ключа — $0,017. Вечером — интент: 19
  выдач ($0,038) и объём нового ключа через Labs ($0,012, данных нет). Всего за 18.11 **$0,085** (баланс $20,9567 → $20,8714, каждый
  вызов — в `spend.log`).
- «США, мес» — среднее за 12 месяцев ноябрь 2025 → октябрь 2026; «сейчас» — среднее августа–октября 2026; «год к году» — к тем же
  12 месяцам годом раньше (ноя.24 → окт.25); «новый» — год назад почти не искали.
- KD — 18.11, три замера, берём наибольший (правило автора 18.11): Semrush ноябрь, Semrush август–октябрь (10 голов) и DataForSEO.
  Подробно — раздел «KD». Semrush — пробный аккаунт автора во встроенном браузере, $0.
  В таблицах у KD: ✅ — все три замера; 🔶 — неполный (месяцы Semrush не сняты или Semrush KD не знает); ⬜ — нет ни у кого.
- Склейки: одна группа Google Ads или та же фраза в другом порядке слов — одна строка, объём один раз. Варианты из скобок тоже можно
  вписывать в текст: это разные формулировки одного спроса.
- Сборка — `sobrat.py` (без сети) → `kluchi.csv`.

## Main — 15 (ключ названия и его вариации)

| # | ключ | США, мес (12 мес) | США сейчас (авг–окт) | мир, мес | год к году | KD реальный | интент | кто ищет (выдача) | зачем |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `export chatgpt conversation` (= export chatgpt conversations · chatgpt export conversation(s) · chatgpt conversation export) | 442 | 487 | 1325 | +0 % | 43 ✅ | ✅ 7/8 | выдача 18.11 ✅: гайды и видео «сохранить чат в PDF», Reddit «весь разговор»; рядом — история и данные целиком | ключ названия: точное вхождение 7–10 раз (канон 2.1.4) |
| 2 | `chatgpt export` (= chatgpt exporter · export chatgpt) | 1741 | 1600 | 6508 | +357 % | 40 ✅ | 🔶 4/8 | выдача 16.11 ✅: пополам: один чат в файл (расширения, exportgpt.pro, приложение для iPhone) и весь архив (Forbes, CLI-бэкап, выгрузка данных); «ChatGPT Exporter» — ещё и имя лидера ниши | самый крупный ключ замера; голова названия — вариация без conversation |
| 3 | `how to export chatgpt conversation` (= how to export chatgpt conversations · chatgpt how to export conversation) | 335 | 247 | 681 | +4 % | 35 ✅ | ✅ 4/7 | выдача 18.11 ✅: один чат — 4 (Reddit, видео, гайды); полная выгрузка данных — 2; Instagram — промпт «вынести контекст» (другое) | хвост ключа названия; вопрос → FAQ |
| 4 | `chatgpt export extension` | 238 | 180 | 587 | +170 % | 0 🔶 | ✅ 7/7 | выдача 18.11 ✅: все 7 — расширения и инструменты выгрузки чата | вариация с хвостом extension |
| 5 | `chatgpt export chat` (= chatgpt export chats · export chatgpt chat · chatgpt chat export) | 186 | 183 | 982 | +60 % | 39 🔶 | ✅ 4/7 | выдача 18.11 ✅: на грани: один чат — 4 (гайды, видео, ChatGPT Exporter); выгрузка данных — 3 | вариация: chat вместо conversation |
| 6 | `how to export a chatgpt conversation` | 175 | 213 | 337 | +52 % | 34 🔶 | ✅ 4/7 | выдача 18.11 ✅: на грани: один чат — 4 (видео, гайд выгрузчика); вся история — 3 (Reddit, видео, Facebook) | хвост ключа названия; вопрос → FAQ |
| 7 | `how to export chatgpt chat` | 157 | 183 | 806 | +64 % | 35 🔶 | ✅ 5/7 | выдача 18.11 ✅: один чат — 5 (видео, Reddit, гайд выгрузчика); выгрузка данных — 2 | вариация chat; вопрос |
| 8 | `export chatgpt conversation to pdf` | 156 | 120 | 537 | -19 % | 41 🔶 | ✅ 8/8 | выдача 18.11 ✅: все 8 — чат в PDF: инструменты, видео, просьба о функции на форуме OpenAI | хвост: PDF |
| 9 | `how to export chatgpt conversation to pdf` | 143 | 213 | 176 | +96 % | 34 🔶 | ✅ 5/7 | выдача 18.11 ✅: чат в PDF — 5; выгрузка всех чатов — 2 | хвост: PDF; вопрос |
| 10 | `export chatgpt to claude` | 393 | 213 | 898 | новый (год назад ≈0) | 36 ✅ | 🔶 1/7 | выдача 18.11 ✅: ровно наше — 1 (memdex.ai: продолжить разговор в Claude); переезд вместе с историей — 3; только память — 3 | вариация с хвостом to claude — новое место 1.2.10; теперь единственный ключ Claude в таблице (transfer и import ушли); честно: переносим разговор, не память |
| 11 | `how to export chatgpt conversation as pdf` (= how to export chatgpt conversations as pdf (10)) | 78 | 113 | 286 | -1 % | 1 🔶 | ✅ 6/8 | выдача 18.11 ✅: чат в PDF и печать — 6 (Reddit, видео, wikiHow, форум OpenAI); выгрузка всего — 2 | хвост: as pdf; вопрос |
| 12 | `can you export chatgpt conversations` | 69 | 43 | 152 | +60 % | 6 🔶 | 🔶 3/7 | выдача 18.11 ✅: больше про выгрузку всех данных — 4; один чат — 3; ИИ-обзор: «да — архив целиком или расширения для отдельных чатов» | хвост; вопрос → FAQ |
| 13 | `how to export chatgpt conversation as text` | 37 | 53 | 98 | новый (год назад ≈1) | ⬜ | ✅ 7/8 | выдача 18.11 ✅: один чат текстом — 7 (форум OpenAI просит «сохранить чат как TXT или Markdown», гайды); Facebook отвечает выгрузкой всего — 1 | хвост: text — Markdown это текст |
| 14 | `export chatgpt conversation chrome extension` | 34 | 10 | 62 | -43 % | 15 🔶 | ✅ 9/9 | выдача 18.11 ✅: все 9 — расширения выгрузки чата | хвост: chrome extension |
| 15 | `how to export a chat from chatgpt` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ 4/7 | выдача 18.11 ✅: на грани: один чат — 4 (2 расширения в CWS, Reddit, Medium); выгрузка данных — 3 (справка OpenAI, скрипт, блог) | новый 18.11 (слово автора: «хороший ключ, 1300, почему нет?») — вместо export entire chatgpt conversation; вариация chat |

Всего в Main ≈4184 поисков в месяц в США за год — без строки 15: объёма Google Ads у неё нет (Semrush — 1 300). По канону Main вписывается в полное описание 15–20 раз: половина — точный ключ
названия, половина — вариации с хвостами (`2.1-meta-cws.md:91`). Строки 1, 3, 6, 8, 9, 11–14 содержат все слова названия — это
«Broad Match» в смысле канона; строки 2, 4, 5, 7, 10, 15 — голова названия (`chatgpt export`, `export chatgpt`) или `chat` вместо
`conversation`: так пишут люди, и спроса у них больше всего 🧮.

## Extra — 15 (другие слова, о том же продукте)

| # | ключ | США, мес (12 мес) | США сейчас (авг–окт) | мир, мес | год к году | KD реальный | интент | кто ищет (выдача) | зачем |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `download chatgpt chat` (= chatgpt chat download) | 88 | 113 | 386 | +69 % | 45 🔶 | ✅ 7/9 | выдача 18.11 ✅: скачать один чат — 7 (видео, форум OpenAI «скачать один чат целиком», MakeUseOf); выгрузка данных — 2; ИИ-обзор понял ключ как «скачать приложение ChatGPT» | ↔ вместо transfer chatgpt to claude, из Запаса: растёт весь год (×2), сейчас ≈113; слово задачи download |
| 2 | `how to save chatgpt conversation` (= how to save chatgpt conversations) | 392 | 300 | 772 | -35 % | 41 ✅ | ✅ 5/7 | выдача 18.11 ✅: один чат — 5 (расширение в CWS, Medium, видео про PDF, Kaggle, HTML-файл); весь аккаунт — 2 (справка OpenAI, Reddit «все мои разговоры») | слово задачи save (не export) |
| 3 | `how to save chatgpt chats` (= chatgpt how to save chats) | 68 | 70 | 177 | -50 % | 7 🔶 | ✅ 4/7 | выдача 18.11 ✅: на грани: один чат — 4 (форум OpenAI просит «выгрузку одного разговора»); все чаты и данные — 3 | ↔ вместо import chatgpt to claude, из Запаса: ровно ≈70 в месяц весь год; save |
| 4 | `chatgpt to pdf` | 368 | 377 | 4950 | -45 % | 40 ✅ | ✅ 8/8 | выдача 18.11 ✅: все 8 — чат в PDF: 3 инструмента (сайт, приложение Google Play, видео про PDFCrowd), 5 «как сделать» (Reddit, YouTube, Facebook) | главная функция: PDF; не путать с «chatgpt pdf» — там загружают PDF в ChatGPT |
| 5 | `how to save chatgpt conversation as pdf` | 238 | 443 | 638 | +45 % | 36 ✅ | ✅ 7/8 | выдача 18.11 ✅: чат в PDF — 7 (гайды, расширения, Reddit «длинный чат печатается пустым»); скрипт для всех чатов — 1 | save + PDF; растёт |
| 6 | `how to download chatgpt conversation` | 238 | 160 | 395 | +4 % | 37 ✅ | ✅ 5/7 | выдача 18.11 ✅: один чат — 5 (Reddit «весь разговор, а не пересказ», расширение в CWS, 2 сайта-выгрузчика, видео); все разговоры разом — 2 (справка OpenAI, скрипт) | слово задачи download |
| 7 | `how to download a chatgpt conversation` | 228 | 307 | 412 | +41 % | 42 ✅ | ✅ 7/8 | выдача 18.11 ✅: один чат, чаще PDF — 7; выгрузка данных — 1 | download; растёт |
| 8 | `print chatgpt conversation` | 120 | 107 | 232 | -10 % | 23 🔶 | ✅ 8/9 | выдача 18.11 ✅: печать и PDF — 8 (гайды, 6 видео; одно — про «ExportGPT», наше ли ⬜); Facebook отвечает выгрузкой всей истории — 1 | слово задачи print |
| 9 | `chatgpt to word extension` | 112 | 77 | 563 | +115 % | 11 🔶 | ✅ 7/9 | выдача 18.11 ✅: чат в Word — 7 (первое — чужое «ChatGPT to Word or PDF»; Reddit «весь разговор в Word или PDF»); официальная надстройка ChatGPT for Word — 2 | Word |
| 10 | `chatgpt to google docs extension` | 96 | 83 | 161 | +153 % | 22 🔶 | 🔶 4/8 | выдача 18.11 ✅: пополам: чат в Docs — 4 (2 расширения в CWS, 2 гайда); ChatGPT внутри Docs — 4 (дополнения, «как добавить ChatGPT в Docs») | Google Docs — новое место 1.3.0; в тексте — «чат в Google Docs», не «ChatGPT в Docs» |
| 11 | `chatgpt to markdown` | 84 | 70 | 474 | +25 % | 29 🔶 | ✅ 6/9 | выдача 11.10 ✅: чат в Markdown — 6 (расширения, скрипты); вся история в Markdown — 3 (Obsidian, конвертеры архива) | Markdown |
| 12 | `save chatgpt conversation` (= save chatgpt conversations) | 80 | 77 | 187 | -21 % | 31 🔶 | ✅ 8/8 | выдача 18.11 ✅: все 8 — сохранить чат, в основном в PDF (видео, гайды) | save |
| 13 | `chatgpt to word` | 73 | 97 | 1592 | -3 % | 32 🔶 | ✅ 7/9 | выдача 16.11 ✅: ответ или чат в Word без потери вида — 7; «создать документ через ChatGPT» — 1; загрузить Word в ChatGPT — 1 (другое) | Word; в мире в 22 раза больше, чем в США |
| 14 | `chatgpt to notion` | 35 | 17 | 493 | -65 % | 0 🔶 | 🔶 2/7 | выдача 16.11 ✅: сохранить чат в Notion — 2 (расширение, видео); ChatGPT внутри Notion — 4 (интеграции, MCP); сравнение Notion AI и ChatGPT — 1 (другое) | Notion — новое место 1.3.0 |
| 15 | `chatgpt to markdown extension` | 93 | 57 | 144 | +675 % | 24 🔶 | ✅ 9/9 | выдача 18.11 ✅: все 9 — расширения «чат в Markdown» | ↔ вместо chatgpt to obsidian, из Запаса: заметки Obsidian — это файлы Markdown |

Всего в Extra ≈2313 в месяц в США. Здесь слова задач — save, download, print — и новые места: Word, Google Docs, Markdown,
Notion. Claude держит Main 10, Obsidian — через Markdown.

**Три замены 18.11 по выдаче** (↔ в «зачем»; почему — в «Что не взяли»): `transfer chatgpt to claude` → `download chatgpt chat`,
`import chatgpt to claude` → `how to save chatgpt chats`, `chatgpt to obsidian` → `chatgpt to markdown extension`. Сумма Extra упала с
≈3031: два ключа Claude давали по 400–500 за год, но сейчас у них ≈213, и ищут ими другое.

## Запас (если какой-то ключ не ляжет в текст)

- `export chatgpt conversation to claude` — 29 в мес (сейчас 27), мир 103, KD ⬜ · точный хвост названия; Claude на уровне разговора
- `transfer chats from chatgpt to claude` — 80 в мес (сейчас 197), мир 152, KD ⬜ · новый кандидат 18.11, в таблице не было: единственный ключ Claude, что растёт после волны (авг–окт: 170 · 210 · 210); слово chats — ровно наш перенос; выдача ≈$0,002 решит
- `export chatgpt conversation to markdown` — 24 в мес (сейчас 20), мир 66, KD ⬜ · точный хвост названия
- `export chatgpt conversation to word` — 17 в мес (сейчас 13), мир 49, KD 4 🔶 · точный хвост названия
- `how do i export chatgpt conversations` — 28 в мес (сейчас 30), мир 54, KD 32 🔶 · хвост названия
- `export chatgpt conversation extension` — 25 в мес (сейчас 33), мир 68, KD 8 🔶 · хвост названия
- `chatgpt to google docs` — 39 в мес (сейчас 30), мир 188, KD 21 🔶 · Google Docs
- `chatgpt to pdf extension` — 534 в мес (сейчас 70), мир 1583, KD 35 🔶 · большой за год, но падает весь год: 1300 в ноябре 2025 → 30 в октябре 2026
- `save chatgpt chrome extension` — 242 в мес (сейчас 33), мир 349, KD 46 🔶 · почти ноль с сентября
- `export entire chatgpt conversation` — 29 в мес (сейчас 37), мир 57, KD ⬜ · был Main 15 → место отдано how to export a chat from chatgpt (слово автора 18.11); хвост: entire — наш Whole chat

## Объём: было и стало (19.11, вопрос автора)

Сколько поисков в месяц ловят ключи. Мерка одна: Google Ads через DataForSEO, США и мир. «Год» — среднее за ноябрь 2025 →
октябрь 2026, «сейчас» — август–октябрь 2026. Скрипт `bylo-stalo.py` ($0, без сети), строки «было» — `bylo-v-tekste.csv`.

| | США, год | США, сейчас | мир, год | ключей |
|---|---|---|---|---|
| было: ключи в нынешнем тексте листинга | 6 195 | 4 447 | 22 761 | 22 |
| было без имени чужого расширения | 4 809 | 4 214 | 21 221 | 20 |
| стало: Main + Extra | 6 497 | 6 213 | 25 011 | 29 из 30 |

- **«Было»** — какие из 910 ключей замера 16.11 стоят в нынешнем тексте (название + краткое + полное, en), точной фразой, в
  том числе внутри длинных фраз (так канон считает вхождения, 2.1.4). Таблицы ключей у старого листинга нет.
- В «было» почти вся разница между «год» и «сейчас» (≈1 590 из 1 750) — два падающих ключа: имя чужого расширения
  `chatgpt print and save extension` (1 324 за год → 203 сейчас) и `chatgpt to pdf extension` (534 → 70).
- **Чего не покрывает:** фразы старого текста вне замера 16.11 (`chatgpt downloader`, `ai exporter`…) — ⬜, поэтому «было» —
  нижняя граница. «Стало» — список ключей, а не текст. Честное сравнение — тем же скриптом по готовому новому тексту; новый
  ключ `how to export a chat from chatgpt` пока без объёма Google (Semrush: 1 300).

## Интент — насколько ключи про нашу боль (18.11)

- **Слово автора 18.11:** «давай мы теперь померяем интенты… насколько они соответствуют нам… Ключи должны соответствовать… той
  боли, которую мы закрываем».
- **Наша боль:** вынести один разговор ChatGPT — в файл (PDF, Word, Markdown) или в другое место (Google Docs, Notion, Obsidian,
  Claude) — целиком или частями.
- **Как мерил:** выдача Google США (компьютер, верхние 10) у всех 30 ключей Main и Extra: 19 куплены 18.11 вечером, 7 — днём 18.11,
  3 — 16.11, 1 — 11.10. Каждый органический результат — одна буква:
  - **O** — наш случай: один чат — сохранить, скачать, распечатать, в PDF, Word или Markdown; расширения-выгрузчики; просьбы о такой
    кнопке на форуме OpenAI;
  - **A** — рядом: вся история или данные аккаунта, все чаты разом, бэкап; ChatGPT внутри Docs, Word или Notion; переезд вместе с
    историей;
  - **X** — другое: только память, загрузить файл в ChatGPT, сравнение сервисов.
  Страница судится по заголовку. Страницы, которые просто повторяют запрос (Facebook «answers», Instagram, TikTok), — по сниппету,
  то есть по ответу.
- **Отметка ключа:** ✅ — наш случай больше половины результатов; ✗ — другое половина и больше; иначе 🔶. Ярлык интента Semrush
  не брал. Буквы каждого ключа — в последнем столбце и в `sobrat.py` (INTENT); сами выдачи — `serp.md` и `raw/`.
- **Итог: ✅ 25, 🔶 5, ✗ 0.** Ключей с чужой болью нет.
- **🔶 — пять:**
  - `chatgpt export` (4 из 8) и `can you export chatgpt conversations` (3 из 7) — пополам с выгрузкой всего аккаунта;
  - `chatgpt to google docs extension` (4 из 8) — пополам с «ChatGPT внутри Docs»;
  - `chatgpt to notion` (2 из 7) — больше про ChatGPT внутри Notion;
  - `export chatgpt to claude` (1 из 7) — переезд с историей и памятью; ровно наше — одна страница (memdex.ai, «продолжить разговор
    ChatGPT в Claude»).
- **На грани ✅ (4 из 7):** `how to export chatgpt conversation`, `chatgpt export chat`, `how to export a chatgpt conversation`,
  `how to export a chat from chatgpt`, `how to save chatgpt chats` — остальные результаты у них про выгрузку всей истории.

| ключ | где | интент | наш случай | рядом | другое | выдача | буквы по порядку |
|---|---|---|---|---|---|---|---|
| `export chatgpt conversation` | Main | ✅ | 7 из 8 | 1 | 0 | 18.11 | OOOOOOAO |
| `chatgpt export` | Main | 🔶 | 4 из 8 | 4 | 0 | 16.11 | AOAOOAAO |
| `how to export chatgpt conversation` | Main | ✅ | 4 из 7 | 2 | 1 | 18.11 | AAOOOXO |
| `chatgpt export extension` | Main | ✅ | 7 из 7 | 0 | 0 | 18.11 | OOOOOOO |
| `chatgpt export chat` | Main | ✅ | 4 из 7 | 3 | 0 | 18.11 | OAOOAAO |
| `how to export a chatgpt conversation` | Main | ✅ | 4 из 7 | 3 | 0 | 18.11 | AOOAOAO |
| `how to export chatgpt chat` | Main | ✅ | 5 из 7 | 2 | 0 | 18.11 | OOOOOAA |
| `export chatgpt conversation to pdf` | Main | ✅ | 8 из 8 | 0 | 0 | 18.11 | OOOOOOOO |
| `how to export chatgpt conversation to pdf` | Main | ✅ | 5 из 7 | 2 | 0 | 18.11 | OOAAOOO |
| `export chatgpt to claude` | Main | 🔶 | 1 из 7 | 3 | 3 | 18.11 | AOAXXAX |
| `how to export chatgpt conversation as pdf` | Main | ✅ | 6 из 8 | 2 | 0 | 18.11 | OOAOOOAO |
| `can you export chatgpt conversations` | Main | 🔶 | 3 из 7 | 4 | 0 | 18.11 | OAAAOOA |
| `how to export chatgpt conversation as text` | Main | ✅ | 7 из 8 | 1 | 0 | 18.11 | OOOAOOOO |
| `export chatgpt conversation chrome extension` | Main | ✅ | 9 из 9 | 0 | 0 | 18.11 | OOOOOOOOO |
| `how to export a chat from chatgpt` | Main | ✅ | 4 из 7 | 3 | 0 | 18.11 | AOOAOOA |
| `download chatgpt chat` | Extra | ✅ | 7 из 9 | 2 | 0 | 18.11 | OOOOOAOOA |
| `how to save chatgpt conversation` | Extra | ✅ | 5 из 7 | 2 | 0 | 18.11 | AOAOOOO |
| `how to save chatgpt chats` | Extra | ✅ | 4 из 7 | 3 | 0 | 18.11 | OOOAAAO |
| `chatgpt to pdf` | Extra | ✅ | 8 из 8 | 0 | 0 | 18.11 | OOOOOOOO |
| `how to save chatgpt conversation as pdf` | Extra | ✅ | 7 из 8 | 1 | 0 | 18.11 | OOOOOOOA |
| `how to download chatgpt conversation` | Extra | ✅ | 5 из 7 | 2 | 0 | 18.11 | OAOAOOO |
| `how to download a chatgpt conversation` | Extra | ✅ | 7 из 8 | 1 | 0 | 18.11 | OOOAOOOO |
| `print chatgpt conversation` | Extra | ✅ | 8 из 9 | 1 | 0 | 18.11 | OOOOAOOOO |
| `chatgpt to word extension` | Extra | ✅ | 7 из 9 | 2 | 0 | 18.11 | OAOOOAOOO |
| `chatgpt to google docs extension` | Extra | 🔶 | 4 из 8 | 4 | 0 | 18.11 | OOAAAOOA |
| `chatgpt to markdown` | Extra | ✅ | 6 из 9 | 3 | 0 | 11.10 | OAAAOOOOO |
| `save chatgpt conversation` | Extra | ✅ | 8 из 8 | 0 | 0 | 18.11 | OOOOOOOO |
| `chatgpt to word` | Extra | ✅ | 7 из 9 | 1 | 1 | 16.11 | OOOOOOAXO |
| `chatgpt to notion` | Extra | 🔶 | 2 из 7 | 4 | 1 | 16.11 | AXOAOAA |
| `chatgpt to markdown extension` | Extra | ✅ | 9 из 9 | 0 | 0 | 18.11 | OOOOOOOOO |

**Что сдвинулось.**
- По интенту — ничего: ✗ не получил ни один ключ, замены из Запаса не понадобились.
- По слову автора 18.11 («хороший ключ, 1300, почему нет?»): `how to export a chat from chatgpt` — в Main 15 вместо
  `export entire chatgpt conversation`, тот — в Запас. Интент нового ключа ✅ на грани (4 из 7). Объём Google Ads ⬜: Labs
  DataForSEO истории по нему не знает ($0,012 ушло без данных), мира в Labs нет совсем; 1 300 — это Semrush за октябрь.

## KD — сложность в Google (18.11)

- **Правило автора 18.11:** KD реальный — наибольшее из трёх: Semrush за ноябрь, Semrush за август–октябрь и DataForSEO.
  Ноябрьский KD Semrush бывает занижен.
- **Что снято 18.11:**
  - Semrush, ноябрь — Bulk Analysis на все 43 ключа: KD у 28. У 15 Semrush пишет «For metrics, refresh» — обновлять не стали,
    бережём аккаунт.
  - Semrush, август–октябрь — Keyword Overview с `date=` у 10 голов (5 Main + 5 Extra по объёму США), 30 страниц по одной: KD у 9,
    август = сентябрь = октябрь у всех 9. У `chatgpt export extension` Semrush KD не знает ни в одном месяце.
  - DataForSEO — один прогон на 43 ключа: KD у 35, $0,017.
  - Итого KD реальный есть у 38 ключей из 43: все три замера (✅) — у 9, неполный (🔶) — у 29, нет ни у кого (⬜) — у 5. Новый
    ключ Main 15 (вечер 18.11) в замерах не был — ⬜.
- **Картина сменилась.** По одному DataForSEO почти всё выглядело лёгким (KD 0–15). Semrush ставит головы на 33–43 ✅, и в Main и
  Extra 17 ключей из 28 с числом — 30 и выше. DataForSEO здесь почти везде ниже Semrush — на 11–44 пункта (у ключа названия 8 против
  43); выше только у `download chatgpt chat` (45 против 35). Калибровка студии (KD ≈ 0,84·DFS + 26) дала бы 26–39 — ближе к Semrush 🧮.
  Поэтому низкий KD «только DFS» (🔶) — не довод, что ключ лёгкий.
- **Ноябрь против августа–октября (10 голов):**
  - `chatgpt to pdf` — ноябрь 29, август–октябрь 40: по ноябрю ключ казался ниже 30, на деле выше.
  - `export chatgpt conversation` (ключ названия) — 37 → 43.
  - Наоборот: `how to download a chatgpt conversation` — ноябрь 42, август–октябрь 33; `how to download chatgpt conversation` — 37
    против 33. KD реальный берёт ноябрь.
  - Остальные пять — разница 0–2; у `chatgpt export extension` чисел нет.
- **Самые высокие:** `save chatgpt chrome extension` 46 (Запас), `download chatgpt chat` 45 (по DataForSEO), `export chatgpt
  conversation` 43, `how to download a chatgpt conversation` 42.
- **Самые низкие с числом Semrush** (только ноябрь, 🔶): `chatgpt to word extension` 11, `chatgpt to google docs` 21 (Запас),
  `print chatgpt conversation` 23, `chatgpt to markdown extension` 24, `transfer chatgpt to claude` 24 (ушёл), `chatgpt to markdown` 29.
- **Для текста стора KD не гейт:** стор ищет своим поиском, не Google. KD нужен, если делать под эти ключи страницы для Google;
  тогда головы с KD 33–43 — ключи «с конкурентами» (у Semrush: нужен хороший уникальный текст), а не открытая дверь.
- Сырьё: `raw/semrush-bulk-2026-11-18.tsv`, `raw/semrush-kd-mesyacy-2026-11-18.tsv`, `raw/kd-dfs.json`; сборка — `sobrat.py`.

| ключ | где | Semrush ноябрь | Semrush авг–окт | DataForSEO 18.11 | KD реальный | что покрыто |
|---|---|---|---|---|---|---|
| `export chatgpt conversation` | Main | 37 | 43 (авг · сен · окт) | 8 | **43** | ✅ Semrush ноя + авг–окт + DFS |
| `chatgpt export` | Main | 40 | 40 (авг · сен · окт) | 15 | **40** | ✅ Semrush ноя + авг–окт + DFS |
| `how to export chatgpt conversation` | Main | 35 | 34 (авг · сен · окт) | 7 | **35** | ✅ Semrush ноя + авг–окт + DFS |
| `chatgpt export extension` | Main | n/a | n/a (авг · сен · окт) | 0 | **0** | 🔶 только DFS: Semrush KD не знает ни в одном месяце |
| `chatgpt export chat` | Main | 39 | не снимали | 9 | **39** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `how to export a chatgpt conversation` | Main | 34 | не снимали | n/a | **34** | 🔶 только Semrush ноя |
| `how to export chatgpt chat` | Main | 35 | не снимали | 8 | **35** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `export chatgpt conversation to pdf` | Main | 41 | не снимали | 0 | **41** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `how to export chatgpt conversation to pdf` | Main | 34 | не снимали | 0 | **34** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `export chatgpt to claude` | Main | 36 | 36 (авг · сен · окт) | 5 | **36** | ✅ Semrush ноя + авг–окт + DFS |
| `how to export chatgpt conversation as pdf` | Main | n/a | не снимали | 1 | **1** | 🔶 только DFS: Semrush KD не знает |
| `can you export chatgpt conversations` | Main | n/a | не снимали | 6 | **6** | 🔶 только DFS: Semrush KD не знает |
| `how to export chatgpt conversation as text` | Main | n/a | не снимали | n/a | **⬜** | ⬜ нет ни у кого |
| `export chatgpt conversation chrome extension` | Main | n/a | не снимали | 15 | **15** | 🔶 только DFS: Semrush KD не знает |
| `how to export a chat from chatgpt` | Main | не снимали | не снимали | не снимали | **⬜** | ⬜ не снимали (ключ новый) |
| `download chatgpt chat` | Extra | 35 | не снимали | 45 | **45** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `how to save chatgpt conversation` | Extra | 41 | 41 (авг · сен · окт) | 10 | **41** | ✅ Semrush ноя + авг–окт + DFS |
| `how to save chatgpt chats` | Extra | n/a | не снимали | 7 | **7** | 🔶 только DFS: Semrush KD не знает |
| `chatgpt to pdf` | Extra | 29 | 40 (авг · сен · окт) | 0 | **40** | ✅ Semrush ноя + авг–окт + DFS |
| `how to save chatgpt conversation as pdf` | Extra | 34 | 36 (авг · сен · окт) | 0 | **36** | ✅ Semrush ноя + авг–окт + DFS |
| `how to download chatgpt conversation` | Extra | 37 | 33 (авг · сен · окт) | 7 | **37** | ✅ Semrush ноя + авг–окт + DFS |
| `how to download a chatgpt conversation` | Extra | 42 | 33 (авг · сен · окт) | 6 | **42** | ✅ Semrush ноя + авг–окт + DFS |
| `print chatgpt conversation` | Extra | 23 | не снимали | 0 | **23** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `chatgpt to word extension` | Extra | 11 | не снимали | 0 | **11** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `chatgpt to google docs extension` | Extra | n/a | не снимали | 22 | **22** | 🔶 только DFS: Semrush KD не знает |
| `chatgpt to markdown` | Extra | 29 | не снимали | 0 | **29** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `save chatgpt conversation` | Extra | 31 | не снимали | 8 | **31** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `chatgpt to word` | Extra | 32 | не снимали | 0 | **32** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `chatgpt to notion` | Extra | n/a | не снимали | 0 | **0** | 🔶 только DFS: Semrush KD не знает |
| `chatgpt to markdown extension` | Extra | 24 | не снимали | 0 | **24** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `export chatgpt conversation to claude` | запас | n/a | не снимали | n/a | **⬜** | ⬜ нет ни у кого |
| `transfer chats from chatgpt to claude` | запас | n/a | не снимали | n/a | **⬜** | ⬜ нет ни у кого |
| `export chatgpt conversation to markdown` | запас | n/a | не снимали | n/a | **⬜** | ⬜ нет ни у кого |
| `export chatgpt conversation to word` | запас | n/a | не снимали | 4 | **4** | 🔶 только DFS: Semrush KD не знает |
| `how do i export chatgpt conversations` | запас | 32 | не снимали | n/a | **32** | 🔶 только Semrush ноя |
| `export chatgpt conversation extension` | запас | n/a | не снимали | 8 | **8** | 🔶 только DFS: Semrush KD не знает |
| `chatgpt to google docs` | запас | 21 | не снимали | 0 | **21** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `chatgpt to pdf extension` | запас | 35 | не снимали | 8 | **35** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `save chatgpt chrome extension` | запас | 46 | не снимали | 2 | **46** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `export entire chatgpt conversation` | запас | n/a | не снимали | n/a | **⬜** | ⬜ нет ни у кого |
| `transfer chatgpt to claude` | не взяли | 24 | не снимали | 3 | **24** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `import chatgpt to claude` | не взяли | 36 | не снимали | 0 | **36** | 🔶 Semrush ноя + DFS; месяцы не сняты |
| `how to transfer chatgpt to claude` | не взяли | 36 | не снимали | n/a | **36** | 🔶 только Semrush ноя |
| `chatgpt to obsidian` | не взяли | n/a | не снимали | 0 | **0** | 🔶 только DFS: Semrush KD не знает |

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
- `transfer chatgpt to claude` (508, сейчас 213), `import chatgpt to claude` (438, сейчас 213), `how to transfer chatgpt to claude`
  (534, сейчас 227) — **ушли 18.11 из Extra и Запаса.** Выдачи ✅ (16.11 — 8 из 8, 18.11 — 6 из 6): переезд целиком — память
  переносит встроенный импорт Claude (Settings → Capabilities), историю — выгрузка аккаунта; софта в выдаче нет. Наш перенос — один
  разговор, а так ищут немногие: в выдаче `export chatgpt to claude` это 1 из 7 (memdex.ai, «продолжить разговор ChatGPT в Claude»).
  У `how to transfer…` своей выдачи нет — те же слова 🔶. Замены из Запаса — `download chatgpt chat` и `how to save chatgpt chats`.
- `switch from chatgpt to claude` (431), `should i switch from chatgpt to claude` (186) — решение перейти, а не перенос данных.
- `chatgpt to obsidian` (21) — **ушёл 18.11 из Extra:** выдача ✅ — 5 из 7 про ChatGPT внутри Obsidian (плагины, GitHub, видео),
  выгрузить чат в Obsidian — 2 из 7 (форум, расширение в CWS). Замена из Запаса — `chatgpt to markdown extension`: заметки Obsidian —
  это файлы Markdown. `obsidian chatgpt` (141 / 1 235) — выдача 16.11 ✅: те же плагины.
- голые `chatgpt word`, `chatgpt notion`, `chatgpt google docs`, `chatgpt markdown` (136 / 107 / 88 / 66) — без глагола неясно, чего
  хотят; самые крупные из таких, проверенные выдачей 16.11, — в основном про другое.
- Gemini (`import chatgpt to gemini` 66, `export chatgpt to gemini` 48) — места Gemini у нас нет.
- «Новый чат» (`chatgpt conversation too long`, `how to continue chatgpt conversation in new chat`) — выдача 16.11: встроенная
  ветка «Branch in new chat» 🔶; наш перенос в Claude это закрывает лишь частично.
- `chatgpt screenshot` (235) — выдача 16.11 ✅: про то, как дать скриншот ChatGPT; картинок мы не делаем.
- ключи «на iPhone», «по ссылке» (`chatgpt link to pdf`), «app» — телефон и ссылки шаринга, не наш путь.

## Важное для текстов (следующий шаг)

- **Слово extension:** в октябре 2026 у всех крупных ключей с этим словом провал (медиана ×0,14), причина ⬜. У
  `chatgpt to pdf extension` спад шёл весь год (1300 → 30), у `save chatgpt chrome extension` — с августа. Год и «сейчас» показаны рядом.
- **Claude:** волна марта 2026 — за год 400–500 в месяц у каждого ключа, сейчас ≈213. Выдачи трёх ключей ✅ (16.11, 18.11): люди
  переезжают целиком; память переносит встроенный импорт Claude, а разговоры им не переносятся — в выдаче об этом прямо пишут 🔶.
  Наше место — «продолжить этот разговор в Claude», не «перенести память». Поэтому в таблице один ключ Claude — Main 10; растёт после
  волны только `transfer chats from chatgpt to claude` (сейчас ≈197, в Запасе, своей выдачи нет 🔶).
- **Один чат, не архив:** у общих ключей с export ИИ-обзор Google начинает с родной выгрузки аккаунта (ZIP со всей историей), и в
  выдаче её много (буква A в разделе «Интент»). Текст должен сказать прямо: один разговор — читаемым файлом или в нужное место, без
  архива всего аккаунта.
- **Бренды** (Word, Google Docs, Notion, Obsidian, Claude) — только внутри фраз, не списком: отказ Keyword Spam 04.10 был за перечни.
  Правило Google — не больше 5 повторов ключа; канон хочет ключ названия 15–20 раз. Это противоречие держать в уме при Тургеневе.
- **В нынешнем тексте** (en, 3 723 знака): «works directly in your browser» — неправда для PDF (он делается на нашем сервере), правда
  теперь для Word, Markdown и передач; «focuses specifically on PDF… too many formats» — устарело.

## Тексты и проверка на спам (19.11)

- **v1** (`teksty/v1.md`) — слово автора 19.11: «Да, утверждаю, ключи и этот текст».
- **v2** — заглавные: канон убирает их в половине вхождений ключей, и в кратком, и в полном (`2.1-meta-cws.md:102`); в
  кратком не было сделано — заметил автор.
- **v3–v5** — Text Checker (канон `2.1b-textchecker-2026-11-19.md`): из жёлтой зоны «близко к переспаму» выведены chat,
  export, conversation и file. Правились только общие слова, кроме одного ключа: `export chatgpt conversation chrome
  extension` (34 в мес, самый малый из 30) ушёл из текста — его export и conversation держали жёлтую зону.
- **Итог v5** (`teksty/v5.md`): красных нет; в жёлтой одно слово из названия — chatgpt 2,78 % (канон это допускает).
  Краткое 128 знаков, полное 4 453; в тексте 29 ключей из 30, вхождений Main 21, Extra 15; строчными — треть ключей в
  кратком и почти половина в полном.
- Оценка риска переспама все пять раз была недоступна (сбой у Ашманова), проверки не списаны. Журнал —
  `teksty/textchecker.log`; локальный счёт — `schet.py` (совпадает с сервисом до единицы по главным словам).

## Пробелы и сколько стоит закрыть

- **Выдачи есть у всех 30 ключей Main и Extra:** 26 сняты 18.11 (`serp.md`), 3 — 16.11, 1 — 11.10. Без выдачи — Запас (кроме `chatgpt to google docs`,
  11.10), в том числе кандидат `transfer chats from chatgpt to claude`: ≈$0,002 штука.
- **Объём Google Ads у `how to export a chat from chatgpt`** ⬜: Labs не знает, мира в Labs нет. США и мир — задача Google Ads
  ≈$0,05–0,09 (выше потолка $0,02), по слову автора; в ту же задачу ложатся `chatgpt exporter browser extension` и
  `can i export a chatgpt conversation`.
- **Тёзка в CWS:** карточка «ExportGPT: Export ChatGPT Conversation» (`jamcijfplmgbngnppdhmbbogjebgfimn`) стоит 2-й в выдаче
  `how to export a chat from chatgpt` и 4-й у `chatgpt export extension`, а ИИ-обзор `chatgpt export extension` описывает ExportGPT
  с боковой панелью кнопок. Наша ли это карточка — ⬜ (сверить ID).
- **KD за август–октябрь** снят только у 10 голов; у остальных 33 ключей — ноябрь Semrush и DataForSEO (🔶). Добрать — Keyword
  Overview с `date=`, 3 страницы на ключ, $0 в пробном Semrush; аккаунт сегодня уже отключали, так что только по слову автора.
  Semrush не знает KD 15 ключей (кнопку «refresh» не нажимали); у 5 ключей KD нет ни у кого.
- **Ключи, которых нет в замере 16.11,** — их показал Semrush на странице `chatgpt export` (октябрь). `how to export a chat from
  chatgpt` (1 300 в месяц по Semrush) взят в Main по слову автора; ещё два — `chatgpt exporter browser extension` (390, KD 39) и
  `can i export a chatgpt conversation` (170, KD 32) — без объёма Google Ads и без выдачи ⬜.
- **Канон называет источник Main — Broad Match в Semrush;** у нас подсказки DataForSEO (на этом же листинге 07-11 они повторили Main и
  Extra автора из Semrush почти один в один) 🧮. Строго по канону — выгрузка Broad Match «export chatgpt conversation» из пробного
  Semrush, **$0** руками.

## Покрытие — что НЕ сделано

- Тексты конкурентов по нашим ключам не сравнивались (канон 2.1.8) — только разбор листингов 04.10.
- Объёмы — Google Ads (DataForSEO), не Semrush; у широких ключей DataForSEO бывает выше Semrush в 2–6 раз (сверка 07-11 🔶).
  Объёмы Semrush за ноябрь — в `raw/semrush-bulk-2026-11-18.tsv`; расходятся в обе стороны: `chatgpt export` 720 против 1 741 у
  Google Ads, а `chatgpt to word` 480 против 73, `chatgpt to notion` 210 против 35.
- Языки, кроме английского, не смотрел (это этап переводов).
