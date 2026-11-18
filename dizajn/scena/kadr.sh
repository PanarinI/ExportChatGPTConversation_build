#!/bin/bash
# Кадры макета сцены (maket.html): kadr.sh — четыре кадра в dizajn/kadry/2026-11-18-scena/ + сводный
set -u
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../kadry/2026-11-18-scena"
mkdir -p "$out"
raw="$(mktemp -d)"
shot() {   # имя  параметры
  prof="$(mktemp -d)"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --allow-file-access-from-files \
    --hide-scrollbars --no-first-run --user-data-dir="$prof" --force-device-scale-factor=2 --window-size=1280,560 \
    --virtual-time-budget=500 --screenshot="$raw/$1.png" "file://$here/maket.html?$2" >/dev/null 2>&1 &
  pid=$!
  for i in $(seq 1 60); do kill -0 $pid 2>/dev/null || break; sleep 0.5; done
  kill $pid 2>/dev/null; rm -rf "$prof"
  swift "$here/../formaty/maket/tools/crop.swift" "$raw/$1.png" "$out/$1.png" 0.5 0 0.5 0.92 >/dev/null
  echo "$1"
}
shot naverh     "s=up"
shot chtenie    "s=down"
shot kniga      "s=bind"
shot chtenie-dark "s=down&dark"
swift "$here/../formaty/maket/tools/side.swift" "$out/scena.png" "$out/naverh.png" "$out/chtenie.png" "$out/kniga.png" >/dev/null
rm -rf "$raw"
ls "$out"
