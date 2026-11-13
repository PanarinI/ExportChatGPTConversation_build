"""Сколько картинок дошло до выгрузки живого стенда в режиме опаздывающих картинок.

Новая страница ChatGPT (замер 13.11, «Художник_базовый»): картинка галереи — blob:, приходит
после сообщения (0,6 с и 1,9 с). Сбор обязан её дождаться (capture.js, GPTPDF_GALLERY).
На коде до правки — 8 из 13, после — 13 из 13, в обоих видах.

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
      --virtual-time-budget=180000 --dump-dom \
      "http://localhost:8840/tests/blockmode-live-stand.html?auto=export&lateimg=empty" > /tmp/late.html
    python3 tests/late-pictures-check.py /tmp/late.html      (и то же с lateimg=append)
Сервер стенда — exportgpt-stend, порт 8840.
"""
import re, sys, html, json, hashlib
t = open(sys.argv[1], encoding='utf-8').read()
m = re.findall(r'<pre id="payload-dump">(\{[\s\S]*?|null)</pre>', t)
p = json.loads(html.unescape(m[-1])) if m else None
if not p:
    sys.exit('❌ стенд не дождался выгрузки')
srcs = re.findall(r'<img[^>]+src="(data:image[^"]+)"', p['html'])
n = len({hashlib.md5(s.encode()).hexdigest() for s in srcs})
print(('✅' if n == 13 else '❌') + f' картинок в выгрузке: {n} из 13 (12 опаздывающих + IMG 5)')
