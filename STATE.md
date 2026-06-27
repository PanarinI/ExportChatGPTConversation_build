# State — где мы сейчас

Живой файл: статус + следующий шаг. Обновлять в КОНЦЕ каждой сессии.
Последнее обновление: **2026-06-27**.

## Фаза
**Stage 5 завершён.** Всё готово к публикации в Chrome Web Store.

## Сделано в этой сессии
- 🟢 **Gotenberg перезапущен** с `--api-timeout=120s` (лечит 503 на больших чатах) и `--chromium-restart-after=10` (лечит 500 от утечки памяти headless Chrome).
- 🟢 **Удалены мёртвые константы** `minImageDuration` и `buttonIconFill` из `common.js`.
- 🟢 **Починен makefile**: убрана строка `cp manifest_chrome.json ...` (файла нет, теперь один `manifest.json`).
- 🟢 **Починен exclude.txt**: `manifest*` → `manifest_*` (чтобы `manifest.json` попадал в билд).
- 🟢 **Дочищен exclude.txt**: добавлены `*.md`, `HISTORY`, `LICENSE`, `icons/misc`, `icons/3rd/pdfcrowd.svg` — архив похудел с 3.3 MB до 640 KB.
- 🟢 **Удалены мёртвые папки** `test/`, `tools/`, `userscript/` — наследие PDFCrowd-форка, несовместимое с новым кодом.
- 🟢 **makefile упрощён** до двух живых таргетов: `build-chrome` и `copyfiles`.
- 🟢 **Версия поднята до 1.1.1** (Igor сделал вручную в manifest.json).
- 🟢 **Сборка `make build-chrome` проверена** — создаёт чистый архив.

## Следующие шаги (по порядку)
1. **Коммит** — см. команду ниже.
2. **Публикация в CWS**: загрузить `save-gptchat-as-pdf-chrome.zip` в Chrome Web Store Developer Dashboard. В "notes to reviewer" написать: *"Extension exports ChatGPT conversations to PDF. It sends HTML content to a self-hosted Gotenberg instance at export-gpt.duckdns.org for PDF conversion. No user data is stored."*

## Архитектура сервера (прод)
Клиент → `https`(443) → Hetzner-фаервол → **Caddy** (TLS-терминация, сертификат) → `reverse_proxy localhost:3000` → **Gotenberg** (Docker, `--api-timeout=120s --chromium-restart-after=10`) → PDF → клиент.
- Конфиг Caddy: `/etc/caddy/Caddyfile`; служба `caddy` (systemd). Вход: `ssh root@89.167.13.19` (по ключу).
- Внешний `3000` закрыт фаерволом Hetzner.

## Мелкие известные issue (приемлемо)
- Wikipedia-стиль inline link — `href` не резолвится.
- 500/503 на очень тяжёлых/фоновых экспортах — стало лучше после поднятия таймаута; остаток лечится ресурсами VPS если понадобится.
