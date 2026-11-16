"""Правила разметки ключей: группа (цель выгрузки), шум, «неясно», пометки. Без сети.
Шум — ключ содержит слова, но значит другое (загрузить файл В ChatGPT, ChatGPT внутри Word, хранит ли ChatGPT данные…).
Шум в покупку объёма не идёт; его объёмы Labs — справка в kandidaty.csv."""
import re

# ---------------------------------------------------------------- группы: (имя, блок, шаблон) — порядок = приоритет
BLOCKS = {'ai': 'Обратно в ИИ', 'fmt': 'Форматы и программы', 'bak': 'Бэкап всей истории', 'cur': 'Наши двери (сравнение)'}
GROUPS = [
    ('Claude', 'ai', r'\bclaude\b|anthropic'),
    ('Gemini', 'ai', r'\bgemini\b'),
    ('NotebookLM', 'ai', r'notebook ?lm'),
    ('Другие ИИ', 'ai', r'\b(grok|deepseek|perplexity|copilot|mistral|llama|meta ai)\b'),
    ('Другой аккаунт ChatGPT', 'bak', r'another (account|email)|new account|other account|chatgpt account\b|account to another'),
    ('Новый чат', 'ai', r'(new|another|next|fresh|different|other) (chat|conversation|thread)|continue|after (the )?limit|too long'
                         r'|maximum (conversation )?length|length limit|conversation limit|transfer chat$|reached the maximum|carry over'),
    ('Память ChatGPT (адресат не назван)', 'ai', r'\bmemor(y|ies)\b'),
    ('PowerPoint и Canva', 'fmt', r'powerpoint|\bppt\b|\bcanva\b|google slides'),
    ('Google Docs', 'fmt', r'google ?docs?\b|\bgdocs?\b|\bdocs\b'),
    ('Word', 'fmt', r'\bword\b|\bdocx\b|(?<!google )\bdoc\b'),
    ('Markdown', 'fmt', r'markdown|\bmd\b'),
    ('Obsidian', 'fmt', r'obsidian'),
    ('Notion', 'fmt', r'notion'),
    ('Текст (txt)', 'fmt', r'\btxt\b|text file|plain text|to text\b|as text\b|export text|chat to text'),
    ('HTML', 'fmt', r'\bhtml\b'),
    ('JSON', 'fmt', r'\bjson\b'),
    ('Картинка и скриншот', 'fmt', r'screenshot|\bimage\b|\bpng\b|\bjpe?g\b|picture'),
    ('Таблицы: Excel, CSV, Sheets', 'fmt', r'excel|\bcsv\b|xlsx|spreadsheet|google sheets?|\bsheets?\b|\btables?\b'),
    ('EPUB и Kindle', 'fmt', r'epub|kindle|ebook|e-book'),
    ('PDF и печать', 'cur', r'\bpdf\b|\bprint|pdfcrowd'),
    ('Бэкап и история', 'bak', r'backup|back up|history|all (my )?(chats|conversations|data)|export all|download all|\bdata\b'
                               r'|archive|bulk|everything|project|how long|export (time|viewer)|export not working'),
    ('Чат в файл, формат не назван', 'cur', r'export|exporter|save|saver|download|copy|transfer|convert|keep|thread|transcript'),
]
FORMAT_GROUPS = [g for g, b, _ in GROUPS if b == 'fmt']

# ---------------------------------------------------------------- шум: (причина, шаблон)
NOISE = [
    ('водяной знак, распознать ИИ-текст', r'watermark|detect|can word tell|turnitin|plagiar|humaniz|check for chatgpt|logo from pdf'),
    ('сравнение ИИ между собой', r'compare|compared|\bvs\b|versus|superior|better than|similar to|good for|so slow|alternative to'),
    ('мнения и выбор ИИ (не перенос)', r'alternatives?\b|talk to claude like|equivalent to|when to use|why (are|is) (people|everyone)'
     r'|leaving chatgpt|users switch'),
    ('скачать само приложение ChatGPT', r'\b(install|installer|apk)\b|^download chatgpt$|^chatgpt download$|download chatgpt (for|on) '
     r'|chatgpt (all versions|for all) download|download chatgpt (locally|model)|download chatgpt locally|chatgpt for word download'
     r'|^chat chatgpt download$|^download chat chatgpt$|voice chat download|chatgpt dataset download'),
    ('файл или данные ВНУТРЬ ChatGPT (обратное направление)', r'^(?!.*(claude|gemini|notebooklm)).*\bupload|can chatgpt read|chatgpt read csv'
     r'|\bread (csv|docx|pdf|word)|chatgpt can ?t read|why can ?t chatgpt read|analy[sz]e|analysis|summari[sz]e'
     r'|(paste|copy)( and paste)? (a |an )?(excel )?table (in|into|to) chatgpt|(to|into) chatgpt( 4)?$|send (a )?screenshot|ask screenshot'
     r'|send chatgpt a pdf|export (apple health|strava|whatsapp)|chatgpt import csv|csv input|chatgpt api csv|code interpreter csv'
     r'|chatgpt csv data$|pdf file upload|convert pdf (for|to) chatgpt|pdf to chatgpt converter|chatgpt and pdf files|chatgpt for pdf files'
     r'|does chatgpt read docx|claude to chatgpt|from claude|connect claude'),
    ('ChatGPT конвертирует чужой файл (PDF→Word, картинка→PDF…)', r'convert(s)? (a )?(pdf|jpg|image) to|\bpdf to (word|excel|ppt|text|audio)'
     r'|jpg to (pdf|word)|image to (pdf|word|html|text)|chatgpt (image|jpg) to |convert (pdf|jpg) .*chatgpt|chatgpt pdf to word converter'
     r'|translate|figma to html|chatgpt to convert pdf'),
    ('файл делает сам ChatGPT (не выгрузка чата)', r'(create|make|generate|write|generated)( a| an)?( word| csv| pdf| excel| docx)? (document|documents|file|files)'
     r'|can chatgpt (create|make|generate|write|edit|format|rewrite)|word document maker|chatgpt generate|python[- ]docx|resume builder'
     r'|unable to create word|download (word document|docx file|csv file|a csv file|pdf generated|pdf from chatgpt|pdf link)|save csv file from'
     r'|mnt/?data|mnt data|not allowed to download files|(can ?t|unable to|won ?t|not) download(ing)? pdf|pdf (not downloading|won ?t download)'
     r'|download pdf not working|pdf download link not working|chatgpt (python )?code to pdf|chatgpt edit word|file export tool not working'),
    ('ChatGPT внутри программы (интеграция, плагин)', r'chatgpt (for|in|inside|on|within) (microsoft |ms )?(word|obsidian|notion|excel|google docs|docs|sheets)\b'
     r'|\b(use|using|insert|integrate|integrating|add|adding|connect|connecting|link|linking) chatgpt (in|into|to|on|with|for) '
     r'|(word|obsidian|notion|google docs) (and|with|or) chatgpt|chatgpt (and|with|or) (word|obsidian|notion)'
     r'|^(?!.*chatgpt to notion).*((add in|add-in|integration|plugin|mcp|\bapi\b).*(word|obsidian|notion)|(word|obsidian|notion).*(add in|add-in|integration|plugin|mcp|\bapi\b))'
     r'|ghostwriter|chatgpt plugins? csv|csv plugin|plugin csv|chatgpt (can )?connect to'),
    ('хранит ли ChatGPT данные (приватность)', r'^(does|do|is|will|where does|how many)\b.*\bsaves?\b|^how long (does|do) chatgpt save'
     r'|chatgpt save (your )?data$|chatgpt save or not|^is chatgpt save|make chatgpt not save|do chatgpt conversations save'),
    ('функция памяти ChatGPT (не выгрузка)', r'save (memory|memories)|memories in chatgpt|memory in chatgpt|save memory full|chatgpt save memory|memories can'),
    ('промпты: сохранить или книга', r'(save|saved|saving) (a |the )?prompts?|save prompts?|save chatgpt prompts?|prompts? (pdf|book|handbook)|prompt (book|pdf)|templates pdf'),
    ('книги и шпаргалки PDF о ChatGPT', r'free download|pdf download free|cheat sheet pdf|course pdf|tutorial pdf|seminar report|millionaire'
     r'|cash machine|research paper pdf|lesson plan pdf|questions and answers pdf|for dummies|bible pdf|prompt engineering|developing apps'
     r'|maximizing productivity|resume pdf|book pdf|ebook pdf|what is chatgpt doing'),
    ('продолжить генерацию ответа (не перенос чата)', r'continue (generating|writing|code|answer|response)|auto[- ]?continue|make chatgpt continue'
     r'|tell chatgpt to continue|get chatgpt to continue|ask chatgpt to continue|prompt chatgpt to continue|chatgpt continue$|continue button'
     r'|remove 1 to continue|need chatgpt[- ]?\d? to continue|continue as guest|continue with google|to continue$|continue to (learn|be)'
     r'|chatgpt continue (answer|response|writing|generating)|^continue chatgpt$|chatgpt how to continue code|api continue|api save context'),
    ('голос ChatGPT', r'\bvoice\b'),
    ('прочее со словом save / transfer', r'save (life|money|itself|the date)|tried to save|try to save|save chatgpt malware|save chatgpt (image|photo)'
     r'|images? as (png|jpg)|image as jpg|save (image|images) from chatgpt|how to save chatgpt searches|save chatgpt in whatsapp'
     r'|3 save itself|transfer learning|style transfer|astrology|subscription|account to another email|where does chatgpt save|backup itself'),
    ('robots.txt и llms.txt (SEO)', r'\brobots?\b|\bllms\b'),
    ('другой смысл', r'^chatgpt new chat$|word (count|limit)|canvas word limit|screenshot (to code|solver|answer|generator|tricks|limit|editor|not working)'
     r'|fake chatgpt screenshot|(interface|ui|app|mobile|plus|premium|atlas|agent|\d) screenshot'
     r'|chatgpt with screenshot|awesome chatgpt screenshot|screen recorder|chatgpt markdown remover|chatgpt remove markdown'
     r'|chatgpt canvas html|for beginners'),
]

# ключи, которые держим всегда (зёрна автора и двери 11.10), даже если правило шума их задело — тогда пометка «неясно»
FORCE_KEEP = set()

# голые «chatgpt + цель» без глагола и без «to» — смысл не ясен без выдачи (может быть ChatGPT ВНУТРИ программы)
BARE = re.compile(r'^(chatgpt|chat gpt) (word|docx|markdown|md|obsidian|notion|txt|html|json|screenshot|table|csv|epub|notebooklm|pdf'
                  r'|backup|excel|google docs|ms word|microsoft word|image)$|^(word|docx|markdown|obsidian|notion|txt|html|json|screenshot|csv|epub'
                  r'|notebooklm|pdf|excel) chatgpt$|^(chatgpt|chat gpt) (pdf|word) file$|^json file chatgpt$|^chatgpt (csv|docx) files?$'
                  r'|^chatgpt excel table$|^chatgpt (txt|epub)$|^epub chatgpt$|^csv chatgpt$|^obsidian chatgpt$|^chatgpt md obsidian$'
                  r'|^screenshot (of )?chatgpt$|^how to (take a )?screenshot on chatgpt$|^chatgpt pdf download$|^pdf download chatgpt$'
                  r'|^chatgpt pdf converter$|^pdf converter chatgpt$|^chatgpt microsoft word$|^chatgpt ms word$|^chatgpt word document$'
                  r'|^chatgpt to text$|^how to export text from chatgpt$|^chatgpt (save|transfer)$|^chatgpt transfer chat$|^transfer chatgpt$'
                  r'|^save chatgpt$|^how to save chatgpt$|^how do you save chatgpt$|^how to save in chatgpt$|^how to save on chatgpt$'
                  r'|^chatgpt canvas (pdf|markdown)$|^chatgpt as pdf$|^chatgpt extension pdf$|^extension chatgpt pdf$|^chatgpt pdf (file|extension)$'
                  r'|^chatgpt continue conversation$|^how to continue a (chat|conversation) (in|with) chatgpt$|^transfer chatgpt account$'
                  r'|^chatgpt memory transfer$|^chatgpt to (gemini|notebooklm)$|^chatgpt save data$|^how to save data (in|from) chatgpt$'
                  r'|^chatgpt export format$|^chatgpt table converter$|^how to transfer chatgpt chats$|^chatgpt notes to pdf$'
                  r'|^chatgpt save history$|^chatgpt export (prompt|github|not working)$|save chats (in|on) chatgpt|chatgpt how to save chats$'
                  r'|^how do (i|you) save chats in chatgpt$|^chatgpt archive$|^archive chatgpt chats$')

NAV = re.compile(r'pdfcrowd|print and save|word or pdf|thinksolv|bibcit|exportgpt|chatgpt exporter save|ai exporter|& navigator'
                 r'|export & share|markdown and plain text extension|& gemini markdown copy|google docs or pdf|long screenshot exporter'
                 r'|chatgpt-pdf extension|to notion (notion )?marketplace|chatgpt to notion no linked db')
QUESTION = re.compile(r'^(how|can|could|does|do|is|are|what|why|where|when|will|should|which|best way)\b')
EXT = re.compile(r'extension|add-?on|plugin|chrome|firefox|safari|edge|bookmarklet')
MOBILE = re.compile(r'iphone|android|mobile|phone|\bapp\b|\bios\b')
PIECE = re.compile(r'\btables?\b|equation|formula|math|\banswers?\b|respons|output|results|\btext\b|code\b')
FORMATTING = re.compile(r'formatting|background|border|lines in word|\bbox\b|without losing|with formatting|format to word|format online')


def classify(key):
    """→ dict(group, block, noise, ambiguous, flags)"""
    k = key.lower().strip()
    noise = ''
    for reason, pat in NOISE:
        if re.search(pat, k):
            noise = reason
            break
    hits = [(g, b) for g, b, pat in GROUPS if re.search(pat, k)]
    group, block = hits[0] if hits else ('?', '')
    fmt_hits = [g for g, b in hits if b == 'fmt' and g not in ('Таблицы: Excel, CSV, Sheets',)]
    flags = []
    if len(set(fmt_hits)) >= 2 and group in FORMAT_GROUPS and not re.search(r'table', k):
        tail = k.rsplit(' to ', 1)[1] if ' to ' in k else ''
        th = sorted({g for g, b, pat in GROUPS if b == 'fmt' and re.search(pat, tail)})
        if set(fmt_hits) == {'Markdown', 'Obsidian'}:
            group = 'Obsidian'
        elif len(th) == 1:
            group = th[0]
            flags.append('из другого формата')
        else:
            group = 'Несколько форматов (имена расширений)'
        block = 'fmt'
    if k == 'ai exporter save chatgpt gemini to pdf':
        group, block = 'PDF и печать', 'cur'
    if any(g == 'PDF и печать' for g, _ in hits) and group != 'PDF и печать' and block == 'fmt':
        flags.append('+PDF')
    if NAV.search(k):
        flags.append('имя чужого расширения')
    if QUESTION.search(k):
        flags.append('вопрос')
    if EXT.search(k):
        flags.append('ищут расширение')
    if MOBILE.search(k):
        flags.append('телефон')
    if group in ('Word', 'Google Docs', 'Таблицы: Excel, CSV, Sheets', 'PDF и печать', 'Markdown') and PIECE.search(k):
        flags.append('кусок (таблица/формула/ответ)')
    if FORMATTING.search(k):
        flags.append('форматирование при вставке')
    if 'link' in k and group in ('PDF и печать', 'Word', 'Чат в файл, формат не назван'):
        flags.append('по ссылке шаринга')
    if 'deep research' in k or 'research to pdf' in k:
        flags.append('deep research')
    if 'canvas' in k:
        flags.append('canvas')
    if 'temporary' in k:
        flags.append('временный чат')
    if re.search(r'\bswitch(ing)?\b', k):
        flags.append('переход (решение)')
    if re.search(r'business|enterprise', k):
        flags.append('Business/Enterprise')
    if 'reddit' in k:
        flags.append('reddit')
    ambiguous = bool(BARE.search(k))
    if noise and k in FORCE_KEEP:
        ambiguous, noise = True, ''
    return dict(group=group, block=block, noise=noise, ambiguous=ambiguous, flags=flags)
