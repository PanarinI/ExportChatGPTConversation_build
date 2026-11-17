#!/bin/bash
# Крупный кадр человечка со стенда krupno.html: kadr.sh <файл.png> "<параметры>"
#   kadr.sh a-down.png "v=c-hat&s=down&t=5200"      (v=old|c-hat|c-hair · s=up|down|bind · t=мс · &dark)
# Свой профиль на каждый запуск и потолок 40 с: зависший Chrome не держит остальные кадры.
set -u
out="$1"; params="$2"
here="$(cd "$(dirname "$0")" && pwd)"
prof="$(mktemp -d)"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --allow-file-access-from-files --hide-scrollbars --no-first-run --user-data-dir="$prof" \
  --window-size=1000,380 --virtual-time-budget=500 --screenshot="$out" \
  "file://$here/krupno.html?$params" >/dev/null 2>&1 &
pid=$!
for i in $(seq 1 80); do kill -0 $pid 2>/dev/null || break; sleep 0.5; done
kill $pid 2>/dev/null
rm -rf "$prof"
[ -s "$out" ] && echo "$out" || echo "НЕТ КАДРА: $out"
