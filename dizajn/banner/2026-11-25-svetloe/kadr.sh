#!/bin/bash
# Три скриншота стора в варианте Б: perekras.py (поле слайдов 1 и 3) → slajd-N.html → slajd-N.png (1280×800, в стор)
# + кадр «было / стало» в dizajn/kadry/2026-11-25-svetloe/. Chrome for Testing, не /Applications Chrome (память, 18.11).
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/../../.."
out="$here/../../kadry/2026-11-25-svetloe"
cft="$HOME/.cache/chrome-for-testing/158.0.8127.36/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
[ -x "$cft" ] || { echo "нет Chrome for Testing: $cft"; exit 1; }
mkdir -p "$out"
python3 -I "$here/perekras.py" 1 >/dev/null
python3 -I "$here/perekras.py" 3 >/dev/null
for n in 1 2 3; do
  prof="$(mktemp -d)"
  "$cft" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --no-first-run \
    --user-data-dir="$prof" --force-device-scale-factor=1 --window-size=1280,800 --virtual-time-budget=800 \
    --screenshot="$here/slajd-$n.png" "file://$here/slajd-$n.html" >/dev/null 2>&1
  rm -rf "$prof"
  echo "slajd-$n.png $(sips -g pixelWidth -g pixelHeight "$here/slajd-$n.png" | awk '/pixel/{printf "%s ", $2}')$(du -k "$here/slajd-$n.png" | cut -f1) КБ"
done
side="$here/../../formaty/maket/tools/side.swift"
swift "$side" "$out/bylo.png" "$here/../2026-10-04-dorabotka/banner.png" "$here/../2026-10-08-formaty/banner.png" \
  "$root/html_pdf_converter/banner/slide2_large_1280_800.png"
swift "$side" "$out/stalo.png" "$here/slajd-1.png" "$here/slajd-2.png" "$here/slajd-3.png"
swift "$here/../../formaty/maket/tools/stack.swift" "$out/bylo-stalo.png" "$out/bylo.png" "$out/stalo.png"
rm -f "$out/bylo.png" "$out/stalo.png"; sips -Z 2400 "$out/bylo-stalo.png" >/dev/null   # для глаза; в стор — slajd-N.png
ls -la "$out"
