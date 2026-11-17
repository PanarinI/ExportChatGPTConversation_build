#!/bin/bash
# Все кадры макета форматов → dizajn/kadry/2026-11-17-formaty/ (сначала: python3 dizajn/formaty/maket/sobrat.py).
# Полный кадр 1440×900 при масштабе 2, потом вырезка: меню — правый верх, окно настроек — середина.
# Сводка varianty.png: верхний ряд «сейчас · A · B», нижний «C · D · A с Markdown».
set -u
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../../kadry/2026-11-17-formaty"
raw="$(mktemp -d)"
mkdir -p "$out"
shot() {   # имя  параметры  вырезка(menu|okno)
  "$here/kadr.sh" "$raw/$1.png" "$2" >/dev/null
  if [ "$3" = menu ]; then swift "$here/tools/crop.swift" "$raw/$1.png" "$out/$1.png" 0.655 0.03 0.345 0.45 >/dev/null
  else swift "$here/tools/crop.swift" "$raw/$1.png" "$out/$1.png" 0.15 0.08 0.70 0.84 >/dev/null; fi
  echo "$1"
}
shot 0-sejchas   "v=0&show=menu"               menu
shot a-pdf       "v=A&show=menu"               menu
shot a-word-dark "v=A&f=word&dark&show=menu"   menu
shot a-md        "v=A&f=md&show=menu"          menu
shot b           "v=B&show=menu"               menu
shot c-pdf       "v=C&show=menu"               menu
shot c-md        "v=C&f=md&show=menu"          menu
shot d-menu      "v=D&show=menu"               menu
shot d-okno      "v=D&show=style"              okno
shot okno-hidden "v=A&noq&show=style"          okno
shot okno-md     "v=A&f=md&show=style"         okno
swift "$here/tools/side.swift" "$raw/r1.png" "$out/0-sejchas.png" "$out/a-pdf.png" "$out/b.png"
swift "$here/tools/side.swift" "$raw/r2.png" "$out/c-pdf.png" "$out/d-menu.png" "$out/a-md.png"
swift "$here/tools/stack.swift" "$out/varianty.png" "$raw/r1.png" "$raw/r2.png"
rm -rf "$raw"
ls -la "$out"
