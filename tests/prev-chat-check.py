"""Какой чат ушёл в выгрузку живого стенда, когда в странице лежит скрытый прежний чат.

После перехода в другой чат без перезагрузки ChatGPT держит прежний в странице, скрытым и первым
(замер у автора 13.11). До правки выгрузка брала его: «своих 0 из 12, чужих 4». Должно быть 12 и 0.

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
      --virtual-time-budget=90000 --dump-dom \
      "http://localhost:8840/tests/blockmode-live-stand.html?auto=export&prevchat=1" > /tmp/prev.html
    python3 tests/prev-chat-check.py /tmp/prev.html          (и то же с &layout=classic)
Сервер стенда — exportgpt-stend, порт 8840.
"""
import re, sys, html, json
t = open(sys.argv[1], encoding='utf-8').read()
m = re.findall(r'<pre id="payload-dump">(\{[\s\S]*?|null)</pre>', t)
p = json.loads(html.unescape(m[-1])) if m else None
if not p:
    sys.exit('❌ стенд не дождался выгрузки')
own = len(set(re.findall(r'(?<!Чужой )Вопрос \d+\?', p['html'])))
alien = len(set(re.findall(r'Чужой вопрос \d+\?', p['html'])))
print(('✅' if own == 12 and alien == 0 else '❌') + f' своих вопросов: {own} из 12 | чужих: {alien}')
