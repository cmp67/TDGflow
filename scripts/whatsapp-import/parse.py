import re, json, sys, collections
src, out, since = sys.argv[1], sys.argv[2], sys.argv[3]
L_US = re.compile(r'^\[(\d{1,2})/(\d{1,2})/(\d{2}), (\d{1,2}:\d{2}:\d{2} [AP]M)\] ([^:]+?): (.*)$')
L_BR = re.compile(r'^\[(\d{2})/(\d{2})/(\d{4}), (\d{2}:\d{2}:\d{2})\] ([^:]+?): (.*)$')
NOISE = re.compile(r'(omitted|omitid[ao]|anexado|This message was deleted|Mensagem apagada|Você apagou|entrou usando|adicionou|saiu$|mudou (o nome|a descrição)|end-to-end|protegidas com a c|figurinha|sticker)', re.I)
msgs = []
for raw in open(src, encoding='utf-8'):
    raw = raw.rstrip('\n').replace('‎', '').replace(' ', ' ')
    m = L_US.match(raw); br = False
    if not m: m = L_BR.match(raw); br = True
    if m:
        a, b, y, t, author, text = m.groups()
        date = f"{y}-{int(b):02d}-{int(a):02d}" if br else f"20{y}-{int(a):02d}-{int(b):02d}"
        msgs.append({'date': date, 'time': t, 'author': author.strip(), 'text': text})
    elif msgs and raw.strip():
        msgs[-1]['text'] += '\n' + raw
def clean_author(a):
    a = re.sub(r'[\U0001F000-\U0001FFFF☀-➿️]', '', a).strip()
    h = len(a)//2
    if len(a) > 6 and a[:h].strip() == a[h:].strip(): a = a[:h].strip()
    return re.sub(r'\s+', ' ', a)
kept = [m for m in msgs if m['date'] >= since and not (NOISE.search(m['text']) and len(m['text']) < 60)]
for m in kept: m['author'] = clean_author(m['author'])
json.dump(kept, open(out, 'w'), ensure_ascii=False, indent=0)
print('total', len(msgs), 'kept', len(kept), 'chars', sum(len(m['text']) for m in kept))
print('por mês:', sorted(collections.Counter(m['date'][:7] for m in kept).items()))
print('autores:', collections.Counter(m['author'] for m in kept).most_common(36))
