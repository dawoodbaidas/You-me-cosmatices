import re, json, os
BASE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(BASE, 'You-Cosmetics.html'), encoding='utf-8', errors='ignore').read()

out = {}

# categories array: J0 = [{id,label},...]
m = re.search(r'J0\s*=\s*\[', s)
if m:
    a = s.index('[', m.start())
    d = 0; end = -1
    for i, ch in enumerate(s[a:], start=a):
        if ch == '[': d += 1
        elif ch == ']':
            d -= 1
            if d == 0: end = i; break
    out['categories_raw'] = s[a:end+1]

# find facebook / instagram url assignments
for name in ['f', 'op']:
    for mm in re.finditer(r'(?:const|let|var)\s+' + re.escape(name) + r'\s*=\s*("(?:[^"\\]|\\.)*")', s):
        out['url_' + name] = mm.group(1)

# social anchors in footer
for mm in re.finditer(r'href:"(https://www\.(?:facebook|instagram)[^"]*)"', s):
    out.setdefault('socials', []).append(mm.group(1))

print(json.dumps(out, ensure_ascii=False, indent=2))