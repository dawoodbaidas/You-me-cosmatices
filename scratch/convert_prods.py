import re
import json

path = 'You-Cosmetics.html'
with open(path, encoding='utf-8', errors='ignore') as f:
    s = f.read()

# imgs
imgs = {}
for m in re.finditer(r'(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*"data:image/[^"]+"', s):
    val = m.group(0).split('=',1)[1].strip().strip('"')
    imgs[m.group(1)] = val

# region
idx = s.find('$S')
a = s.find('[', idx)
d = 0; end = -1
for i,ch in enumerate(s[a:], start=a):
    if ch == '[': d+=1
    elif ch == ']':
        d-=1
        if d==0:
            end=i; break
region = s[a:end+1]

objs = []
for m in re.finditer(r'\{\s*id\s*:\s*"', region):
    start = m.start()
    d2 = 0; in_str=False; esc=False; q=None
    for k,ch in enumerate(region[start:], start=start):
        if in_str:
            if esc: esc=False; continue
            if ch == '\\': esc=True; continue
            if ch == q: in_str=False; q=None; continue
            continue
        else:
            if ch == '"' or ch == "'": in_str=True; q=ch; continue
            if ch == '{': d2+=1
            elif ch == '}':
                d2-=1
                if d2==0:
                    objs.append(region[start:k+1])
                    break

prods = []
for o in objs:
    mid = re.search(r'id\s*:\s*"([^"]+)"', o)
    if not mid: continue
    pid = mid.group(1)
    if pid in ['skincare','makeup','lips','mist','packages','bestseller','skincare-body']: continue
    # fix image refs
    o2 = o
    # replace image: kW
    o2 = re.sub(r'image\s*:\s*([A-Za-z0-9_$]+)\b', lambda mm: f'image:"{mm.group(1)}.webp"', o2)
    prods.append(o2)

result = []
for o2 in prods:
    try:
        # eval carefully - convert to js object via Node? easier to use Python ast by fixing quotes? not quite
        # use json5-like approach - replace unquoted keys where safe
        s2 = o2
        # quote unquoted keys (simple cases)
        s2 = re.sub(r'([,{])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', s2)
        # fix image file refs we added
        data = json.loads(s2)
        result.append(data)
    except Exception as e:
        pass

# add image data
for p in result:
    if p.get('image') and p['image'].endswith('.webp'):
        key = p['image'][:-5]
        if key in imgs:
            p['imageData'] = imgs[key]
            p['imageFile'] = p['id'] + '.webp'

with open('products_from_html.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(len(result))
