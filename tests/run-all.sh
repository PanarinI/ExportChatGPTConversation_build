#!/bin/bash
# Вся батарея тестов: node-тесты и headless-стенды (*-test.html). Строка на тест: OK или BAD с первой упавшей проверкой.
# Запуск из корня репо: bash tests/run-all.sh   (стенды скролла идут долго — до нескольких минут)
cd "$(dirname "$0")/.."
for t in look-test page-furniture-test paper-wire-test settings-update-test image-queue-test; do
  printf "%s: " $t; node tests/$t.js 2>&1 | tail -1
done
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for t in tests/*-test.html; do
  b=$(basename $t .html)
  case $b in harvest-climb-test|harvest-reversed-test) vt=600000;; harvest-wrappers-test) vt=1200000;; *) vt=60000;; esac
  r=$("$C" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=$vt --dump-dom "file://$PWD/$t" 2>/dev/null | python3 -I -c "
import sys,re,html
s=sys.stdin.read()
m=re.search(r'<(?:div|pre) id=\"(?:log|out)\"[^>]*>(.*?)</(?:div|pre)>',s,re.S)
t=html.unescape(re.sub(r'<[^>]+>','\n',m.group(1) if m else ''))
ls=[l for l in t.splitlines() if l.strip()]
bad=[l for l in ls if re.search(r'✗|FAIL|❌',l)]
print(('OK' if ls and not bad else 'BAD '+str(len(bad))+' '+(bad[0][:90] if bad else 'no output')))")
  echo "$b:$r"
done
