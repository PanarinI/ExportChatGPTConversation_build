# State — где мы сейчас

Живой файл: статус + следующий шаг. Обновлять в КОНЦЕ каждой сессии.
Последнее обновление: **2026-06-27**.

## Фаза
**Stage 5 завершён. Ожидает публикации в Chrome Web Store.**

## Сделано в предыдущей сессии (до этой)
- 🟢 Gotenberg перезапущен с `--api-timeout=120s` и `--chromium-restart-after=10`
- 🟢 Удалены мёртвые константы, починен makefile и exclude.txt
- 🟢 Удалены мёртвые папки `test/`, `tools/`, `userscript/`
- 🟢 makefile упрощён до `build-chrome` / `copyfiles`
- 🟢 Версия поднята до 1.1.1; сборка `make build-chrome` проверена

## Сделано в этой сессии (2026-06-27)
- 🟢 **Создан `CLAUDE.md`** — контекст проекта для экономии токенов в новых сессиях
- 🟢 **Починен GA4 client_id**: был `Math.random()` при каждом событии → теперь генерируется один раз и сохраняется в `chrome.storage.local`. GA4 видит одного пользователя, а не нового при каждом клике.
- 🟢 **Добавлен флаг `gptpdfShared.IS_DEV`** в `shared.js` (сейчас `false`). Установить в `true` в dev-версии — события GA4 не отправляются, статистика не загрязняется тестами.

## Следующие шаги
1. **Перед работой в dev:** открыть `shared.js`, поставить `IS_DEV = true`.
2. **Перед публикацией:** вернуть `IS_DEV = false`, проверить что `IS_DEV = false` в финальном архиве.
3. **Коммит** текущих изменений.
4. **Публикация в CWS**: загрузить `save-gptchat-as-pdf-chrome.zip`. В "notes to reviewer":
   *"Extension exports ChatGPT conversations to PDF. It sends HTML content to a self-hosted Gotenberg instance at export-gpt.duckdns.org for PDF conversion. No user data is stored."*

## Архитектура сервера (прод)
Клиент → `https`(443) → Hetzner-фаервол → **Caddy** (TLS-терминация, сертификат) → `reverse_proxy localhost:3000` → **Gotenberg** (Docker, `--api-timeout=120s --chromium-restart-after=10`) → PDF → клиент.
- Конфиг Caddy: `/etc/caddy/Caddyfile`; служба `caddy` (systemd). Вход: `ssh root@89.167.13.19` (по ключу).
- Внешний `3000` закрыт фаерволом Hetzner.

## Мелкие известные issue (приемлемо)
- Wikipedia-стиль inline link — `href` не резолвится.
- 500/503 на очень тяжёлых/фоновых экспортах — стало лучше после поднятия таймаута; остаток лечится ресурсами VPS если понадобится.
