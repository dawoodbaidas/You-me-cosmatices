import re
import json

path = 'You-Cosmetics.html'
with open(path, encoding='utf-8', errors='ignore') as f:
    s = f.read()

# find products array
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

# extract each object
objs = []
# pattern
for m in re.finditer(r'\{\s*id\s*:\s*"', region):
    start = m.start()
    d2 = 0
    in_str = False
    esc = False
    q = None
    # scan
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
# filter non-product
prods = []
for o in objs:
    # quick check
    if '"id"' in o or 'id:' in o:
        # extract id
        mid = re.search(r'id\s*:\s*"([^"]+)"', o)
        if mid:
            pid = mid.group(1)
            if pid not in ['skincare','makeup','lips','mist','packages','bestseller','skincare-body']:
                prods.append(o)
print(len(prods))
