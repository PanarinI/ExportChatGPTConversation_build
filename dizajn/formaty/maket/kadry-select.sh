#!/bin/bash
# Кадры к «Select to export» 18.11 (слово автора: «выглядит как призыв, что сюда нужно нажать, чтобы
# экспортировать»): настоящее меню 1.2.9-dev на живом стенде — как есть и два предложения (?menuvar=a|b,
# накладываются только в стенде). Сервер стенда exportgpt-stend (порт 8840) — запустить до кадров.
# История: накладка ?menuvar жила в стенде до коммита 728edde; 18.11 автор выбрал A, он в продукте — скрипт не перезапускать.
# → dizajn/kadry/2026-11-18-select-to-export/
set -u
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../../kadry/2026-11-18-select-to-export"
mkdir -p "$out"
raw="$(mktemp -d)"
shot() {   # имя  параметры
  prof="$(mktemp -d)"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
    --no-first-run --user-data-dir="$prof" --force-device-scale-factor=2 --window-size=1280,860 \
    --virtual-time-budget=8000 --screenshot="$raw/$1.png" \
    "http://localhost:8840/tests/blockmode-live-stand.html?demo=1&$2" >/dev/null 2>&1 &
  pid=$!
  for i in $(seq 1 80); do kill -0 $pid 2>/dev/null || break; sleep 0.5; done
  kill $pid 2>/dev/null; rm -rf "$prof"
  swift "$here/tools/crop.swift" "$raw/$1.png" "$out/$1.png" 0.6 0.02 0.4 0.40 >/dev/null
  echo "$1"
}
shot seychas    "fmt=word&show=menu"
shot variant-a  "fmt=word&show=menu&menuvar=a"
shot variant-b  "fmt=word&show=menu&menuvar=b"
shot variant-a-dark "fmt=word&show=menu&menuvar=a&pagetheme=newdark"
swift "$here/tools/side.swift" "$out/vybor.png" "$out/seychas.png" "$out/variant-a.png" "$out/variant-b.png" >/dev/null
rm -rf "$raw"
ls "$out"
