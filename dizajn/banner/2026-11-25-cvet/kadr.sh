#!/bin/bash
# Кадры сравнения цвета (banner.html?v=now|a|b) → dizajn/kadry/2026-11-25-cvet/ + сводный ряд sravnenie.png.
# Chrome for Testing, не /Applications Chrome: тот занимает «Google Chrome» в macOS (память, 18.11).
set -u
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../../kadry/2026-11-25-cvet"
cft="$HOME/.cache/chrome-for-testing/158.0.8127.36/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
[ -x "$cft" ] || { echo "нет Chrome for Testing: $cft"; exit 1; }
mkdir -p "$out"
shot() {   # имя  вариант
  prof="$(mktemp -d)"
  "$cft" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --no-first-run \
    --user-data-dir="$prof" --force-device-scale-factor=1 --window-size=1280,800 --virtual-time-budget=800 \
    --screenshot="$out/$1.png" "file://$here/banner.html?v=$2" >/dev/null 2>&1 &
  pid=$!
  for i in $(seq 1 60); do kill -0 $pid 2>/dev/null || break; sleep 0.5; done
  kill $pid 2>/dev/null; rm -rf "$prof"
  echo "$1"
}
shot sejchas now
shot a-oranzhevyj a
shot b-svetloe b
swift "$here/../../formaty/maket/tools/side.swift" "$out/sravnenie.png" "$out/sejchas.png" "$out/a-oranzhevyj.png" "$out/b-svetloe.png" >/dev/null
ls -la "$out"
