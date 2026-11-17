#!/bin/bash
# Кадры настоящего меню 1.2.9-dev (не макета): живой стенд с демо-чатом через сервер стенда
# (exportgpt-stend, порт 8840 — запустить до кадров). → dizajn/kadry/2026-11-18-formaty-dev/
# Параметры стенда: fmt=pdf|word|md · noq (Questions › Hidden) · pagetheme=newdark · show=menu|style|paper.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../../kadry/2026-11-18-formaty-dev"
mkdir -p "$out"
raw="$(mktemp -d)"
shot() {   # имя  параметры  вырезка: menu | okno
  prof="$(mktemp -d)"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
    --no-first-run --user-data-dir="$prof" --force-device-scale-factor=2 --window-size=1280,860 \
    --virtual-time-budget=8000 --screenshot="$raw/$1.png" \
    "http://localhost:8840/tests/blockmode-live-stand.html?demo=1&$2" >/dev/null 2>&1 &
  pid=$!
  for i in $(seq 1 80); do kill -0 $pid 2>/dev/null || break; sleep 0.5; done
  kill $pid 2>/dev/null; rm -rf "$prof"
  if [ "$3" = menu ]; then swift "$here/tools/crop.swift" "$raw/$1.png" "$out/$1.png" 0.6 0.02 0.4 0.36 >/dev/null
  else swift "$here/tools/crop.swift" "$raw/$1.png" "$out/$1.png" 0.12 0.06 0.76 0.88 >/dev/null; fi
  echo "$1"
}
shot menu-pdf       "fmt=pdf&show=menu"                    menu
shot menu-word      "fmt=word&show=menu"                   menu
shot menu-md        "fmt=md&show=menu"                     menu
shot menu-md-dark   "fmt=md&show=menu&pagetheme=newdark"   menu
shot okno-md        "fmt=md&show=style"                    okno
shot okno-hidden    "fmt=pdf&noq&show=style"               okno
shot okno-word-paper "fmt=word&show=paper"                 okno
swift "$here/tools/side.swift" "$out/menyu.png" "$out/menu-pdf.png" "$out/menu-word.png" "$out/menu-md.png" >/dev/null
rm -rf "$raw"
ls "$out"
