# Export ChatGPT Conversation

## Introduction

## Installation

### Browser Extension

### User Script

## Links

## License

This project is licensed under the [MIT License](LICENSE).

cd /Users/igor/PycharmProjects/save-chatgpt-as-pdf && git add background.js manifest.json && git commit -F - <<'EOF'
Switch PDF backend to HTTPS domain instead of raw-IP HTTP

Export now POSTs to https://export-gpt.duckdns.org (Caddy +
Let's Encrypt in front of Gotenberg) instead of
http://89.167.13.19:3000, so the conversation travels encrypted.
Update the matching host_permission in manifest.json.

EOF
