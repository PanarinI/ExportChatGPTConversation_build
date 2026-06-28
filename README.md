# Export ChatGPT Conversation

Браузерное расширение (Chrome/Firefox): экспортирует диалог ChatGPT в PDF.
Рендер PDF выполняет self-hosted Gotenberg за HTTPS-прокси.

## Установка

- **Chrome Web Store:** опубликовано (v1.1.x).
- **Сборка из исходников:** `make build-chrome`, затем в `chrome://extensions`
  включить Developer mode → *Load unpacked* → выбрать собранную папку.

## Архитектура (кратко)

Content scripts на `chatgpt.com` собирают диалог → service worker отправляет HTML
на бэкенд (Gotenberg за Caddy/HTTPS) → готовый PDF возвращается пользователю.

## Лицензия

MIT — см. [LICENSE](LICENSE). Форк проекта `pdfcrowd/save-chatgpt-as-pdf`.
