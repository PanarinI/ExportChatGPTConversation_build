# save-chatgpt-as-pdf

Chrome/Firefox extension: экспортирует ChatGPT-чат в PDF через self-hosted Gotenberg на VPS.

## Память проекта (читать в начале сессии)
- **STATE.md** — где мы сейчас + следующий шаг (меняется часто).
- **DECISIONS.md** — почему приняты ключевые решения (не выводится из кода/git).
- Этот файл — стабильное: архитектура, соглашения, правила.

## Архитектура

Content scripts (на chatgpt.com) + service worker, порядок загрузки в манифесте:
`shared.js` → `templates.js` → `helpers.js` → `theme.js` → `render.js` → `capture.js` → `settings.js` → `blockmode.js` → `common.js` → `request.js`

Файлы:
- `common.js` — "мозг": инжектирует кнопку Export, оркестрирует экспорт, `gptpdfChatGPT.init()`
- `capture.js` — харвест виртуализированных turns + base64 изображений (flaky-критичный)
- `render.js` — `cleanupForPdf`, `extractDalleImages`, `buildExportCss`, TOC, заголовки, code-blocks
- `blockmode.js` — режим "Select to export" (блочный выбор)
- `settings.js` — `gptpdf*`-функции настроек + `wireSettings()`
- `helpers.js` — чистые DOM/util функции
- `theme.js` — `EXPORT_THEMES`
- `templates.js` — `UI_CSS`, `EXPORT_BUTTON_HTML`
- `background.js` — вызывает Gotenberg, fetchит auth-protected images
- `shared.js` — `gptpdfShared`: опции/дефолты/версия

## Критические правила

- НЕ переписывать с нуля — запутанный код кодирует hard-won edge cases ChatGPT DOM (виртуализация, double KaTeX, sr-only labels, DALL-E wrappers, CORS favicon). Контекст — в DECISIONS.md.
- Рефакторить слоями, одним инкрементом за раз, с тестом после каждого.
- Нейминг: единый префикс `gptpdf` (namespace/функции/CSS-классы/id/data-атрибуты). Легаси `pdfcrowd`/`pcr` удалены. Namespace: `gptpdfChatGPT`, общий — `gptpdfShared`.
- Flaky-export: проверять 5–10× (экспорт reference-чата, считать страницы + кликабельные ссылки).

## Бэкенд (Gotenberg за Caddy)

Расширение шлёт HTML на `https://export-gpt.duckdns.org/forms/chromium/convert/html`
(зашито в `background.js`; разрешение — в `manifest.json` → host_permissions).

Серверная цепочка (VPS Hetzner, Ubuntu, `89.167.13.19`):
клиент → `https`(443) → Hetzner-фаервол (open 22/80/443) → **Caddy** (TLS-терминация, авто-сертификат
Let's Encrypt) → `reverse_proxy localhost:3000` → **Gotenberg** (Docker) → PDF обратно.
- Caddyfile: `/etc/caddy/Caddyfile`; служба `caddy` (systemd). Вход на VPS: `ssh root@89.167.13.19` (по ключу).
- Внешний `3000` закрыт; Caddy↔Gotenberg по localhost. HTTPS сделан; остаток Stage 5 — timeout/ресурсы Gotenberg (503/500).

## Что НЕ трогать без обсуждения

- Логику `harvestVirtualizedTurns` в `capture.js` (flaky-fix уже сидит там).
- Связку `gptpdf-*` (классы/id/data-атрибуты): живёт в markup `templates.js` + CSS + JS одновременно — переименовывать только синхронно.
- "welcome ripple" — подсветку кнопки при первом запуске (Igor хочет оставить).

## Протокол завершения сессии («чекпоинт»)

**Триггер:** Igor пишет **«чекпоинт»**, ИЛИ ассистент сам предлагает его на логической границе.

**Когда уместно:** закончен осмысленный кусок (и работает/протестирован); перед долгой паузой или концом дня; когда сессия разрослась. НЕ посреди недоделанной задачи.

**Чеклист по «чекпоинту»:**
1. Перезаписать **STATE.md** — текущий статус + следующие шаги.
2. Дописать новые «почему» в **DECISIONS.md** (если были решения).
3. Проверить/поправить **CLAUDE.md** (если изменились архитектура/соглашения/правила).
4. Кратко перечислить, что сделано за сессию.
5. Выдать «первое сообщение для НОВОЙ сессии».

Затем — начинать свежую сессию: контекст восстанавливается из этих файлов, а не из истории чата.
