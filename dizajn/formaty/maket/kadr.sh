#!/bin/bash
# Кадр макета форматов: kadr.sh <файл.png> "<параметры>" [ширина высота]
#   kadr.sh a.png "v=A&show=menu"        (v=A|B|C|D · f=pdf|word|md · dark · show=menu|style|paper|header · noq)
# Масштаб 2 (как на ретине). Свой профиль на каждый запуск и потолок 40 с: зависший Chrome не держит остальные кадры.
set -u
out="$1"; params="$2"; w="${3:-1440}"; h="${4:-900}"
here="$(cd "$(dirname "$0")" && pwd)"
prof="$(mktemp -d)"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --allow-file-access-from-files --hide-scrollbars --no-first-run --user-data-dir="$prof" \
  --force-device-scale-factor=2 --window-size="$w,$h" --virtual-time-budget=6000 --screenshot="$out" \
  "file://$here/../maket-formaty.html?$params&kadr" >/dev/null 2>&1 &
pid=$!
for i in $(seq 1 80); do kill -0 $pid 2>/dev/null || break; sleep 0.5; done
kill $pid 2>/dev/null
rm -rf "$prof"
[ -s "$out" ] && echo "$out" || echo "НЕТ КАДРА: $out"
