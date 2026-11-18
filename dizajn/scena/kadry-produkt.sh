#!/bin/bash
# Кадры сцены в продукте (не макет): tests/progress-card-stand.html?step=walk&manual — настоящие templates.js,
# capture.js и anim.js; кадр в заданную секунду прогона. → dizajn/kadry/2026-11-18-scena/produkt-*.png + сводный
set -u
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/../.."
out="$here/../kadry/2026-11-18-scena"
mkdir -p "$out"
raw="$(mktemp -d)"
shot() {   # имя  мс_прогона  тема
  prof="$(mktemp -d)"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --allow-file-access-from-files \
    --hide-scrollbars --no-first-run --user-data-dir="$prof" --force-device-scale-factor=2 --window-size=640,470 \
    --virtual-time-budget=$2 --screenshot="$out/$1.png" \
    "file://$root/tests/progress-card-stand.html?step=walk&manual&theme=$3" >/dev/null 2>&1 &
  pid=$!
  for i in $(seq 1 90); do kill -0 $pid 2>/dev/null || break; sleep 0.5; done
  kill $pid 2>/dev/null; rm -rf "$prof"
  echo "$1"
}
shot produkt-podem       3000  light
shot produkt-chtenie     11000 light
shot produkt-kniga       29500 light
shot produkt-chtenie-dark 11000 dark
swift "$here/../formaty/maket/tools/side.swift" "$out/produkt.png" "$out/produkt-podem.png" "$out/produkt-chtenie.png" "$out/produkt-kniga.png" >/dev/null
rm -rf "$raw"
