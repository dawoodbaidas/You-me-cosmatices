import re, os, json, base64
BASE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(BASE, 'You-Cosmetics.html'), encoding='utf-8', errors='ignore').read()

imgs = {}
for m in re.finditer(r'(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*"data:image/[^"]+"', s):
    imgs[m.group(1)] = m.group(0).split('=', 1)[1].strip().strip('"')

prods = json.load(open(os.path.join(BASE, 'products_from_html.json'), encoding='utf-8'))
used = set()
for p in prods:
    if p.get('image'):
        used.add(p['image'].replace('.webp', ''))

outdir = os.path.join(BASE, 'web-app', 'public', 'products')
os.makedirs(outdir, exist_ok=True)

written = []
for p in prods:
    key = p['image'].replace('.webp', '')
    if key in imgs:
        ext = 'png' if imgs[key].startswith('data:image/png') else ('jpg' if imgs[key].startswith('data:image/jpeg') else 'webp')
        fn = p['id'] + '.' + ext
        with open(os.path.join(outdir, fn), 'wb') as f:
            f.write(base64.b64decode(imgs[key].split(',', 1)[1]))
        written.append((fn, len(imgs[key])))
    else:
        print('MISSING IMAGE FOR', p['id'])

# logo: OK variable is used in header/hero/footer img src
logo_keys = [k for k in imgs if k not in used]
print('\nunused image vars:', sorted(logo_keys))
if 'OK' in imgs:
    ext = 'png' if imgs['OK'].startswith('data:image/png') else 'jpg'
    os.makedirs(os.path.join(BASE, 'web-app', 'public', 'brand'), exist_ok=True)
    with open(os.path.join(BASE, 'web-app', 'public', 'brand', 'logo.' + ext), 'wb') as f:
        f.write(base64.b64decode(imgs['OK'].split(',', 1)[1]))
    print('logo written')
print('products written:', len(written))