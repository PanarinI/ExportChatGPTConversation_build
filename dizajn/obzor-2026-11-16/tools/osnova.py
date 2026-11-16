"""Mock of «step 1 — the base» for frames: copies a stand dump and adds one stylesheet plus wider margins to its payload.
Not product code: the real change goes into render.js / background.js after the author's word.
python3 -I osnova.py <stand dump> <new dump>"""
import re, sys, json
src, out = sys.argv[1], sys.argv[2]
CSS = """
html body{font-family:'Noto Sans',sans-serif !important;color:#1f1f1f !important}
html body :is(p,li,td,th,blockquote,div,span,a,strong,em,b,i,h1,h2,h3,h4,h5,h6){font-family:'Noto Sans',sans-serif !important}
.markdown,.markdown :is(p,li,blockquote){font-size:11pt !important;line-height:1.55 !important}
.markdown p{margin:0 0 7pt !important}
.markdown :is(ul,ol){margin:2pt 0 8pt !important;padding-left:16pt !important}
.markdown li{margin:2pt 0 !important}
.markdown :is(h1,h2,h3,h4,h5,h6){font-size:13pt !important;line-height:1.3 !important;margin:10pt 0 5pt !important;font-weight:700 !important}
h1.main-title{font-size:20pt !important;line-height:1.25 !important;margin:0 0 4pt !important}
a[href^="#toc-"]{text-decoration:none !important;color:#1f1f1f !important;font-size:10pt !important}
.gptpdf-user-turn{margin-top:20pt !important}
[data-message-author-role="user"]{margin-bottom:6pt !important}
[data-message-author-role="user"] .whitespace-pre-wrap{font-size:10.5pt !important;line-height:1.45 !important}
.markdown table{margin:4pt 0 10pt !important}
.markdown :is(td,th){font-size:10pt !important;line-height:1.4 !important;padding:5pt 8pt !important}
.markdown pre{background:#f6f7f9 !important;border:1px solid #e2e5e9 !important;border-radius:6px !important;padding:8pt 10pt !important;margin:4pt 0 10pt !important;white-space:pre-wrap !important}
.markdown pre *{background:transparent !important}
.markdown pre,.markdown pre *{font-family:'Noto Sans Mono',monospace !important;font-size:9pt !important;line-height:1.5 !important}
.markdown .katex-display,.markdown>span[role="math"]{display:block !important;margin:8pt 0 10pt !important}
.markdown :not(pre)>code{font-family:'Noto Sans Mono',monospace !important;font-size:.88em !important;background:#f1f2f4 !important;padding:1px 4px !important;border-radius:4px !important}
"""
t = open(src, encoding='utf-8').read()
m = list(re.finditer(r'<pre id="payload-dump">(\{[\s\S]*?|null)</pre>', t))[-1]
u = lambda s: s.replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&amp;', '&')
p = json.loads(u(m.group(1)))
style = '<style>' + CSS + '</style>'
p['html'] = p['html'].replace('</body>', style + '</body>', 1) if '</body>' in p['html'] else p['html'] + style
p['params'].update({'margin_left': '20mm', 'margin_right': '20mm', 'margin_top': '18mm', 'margin_bottom': '18mm'})
e = json.dumps(p, ensure_ascii=False).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
open(out, 'w', encoding='utf-8').write('<pre id="payload-dump">' + e + '</pre>')
print('ok')
