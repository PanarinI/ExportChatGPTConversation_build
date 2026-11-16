"""Make a copy of a stand dump whose payload HTML forces one body font (mock for comparison, not product code).
python3 -I shrift.py stand-dump.html out-dump.html "Noto Serif" """
import re, sys, json, html as H
src, out, fam = sys.argv[1], sys.argv[2], sys.argv[3]
t = open(src, encoding='utf-8').read()
m = list(re.finditer(r'<pre id="payload-dump">(\{[\s\S]*?|null)</pre>', t))[-1]
u = lambda s: s.replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&amp;', '&')
p = json.loads(u(m.group(1)))
css = ("<style>html body, html body :is(p,li,td,th,blockquote,div,span,a,strong,em,b,i,h1,h2,h3,h4,h5,h6)"
       "{font-family:'%s' !important}</style>" % fam)
p['html'] = p['html'].replace('</body>', css + '</body>', 1) if '</body>' in p['html'] else p['html'] + css
open(out, 'w', encoding='utf-8').write('<pre id="payload-dump">' + json.dumps(p, ensure_ascii=False).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;') + '</pre>')
print('ok', fam)
