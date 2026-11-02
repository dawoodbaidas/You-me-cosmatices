import re
import json

path = 'You-Cosmetics.html'
with open(path, encoding='utf-8', errors='ignore') as f:
    s = f.read()

# get products array slice
idx = s.find('const $S')
if idx == -1:
    idx = s.find('$S =')
a = s.find('[', idx) if idx >=0 else s.find('[')
if a == -1: raise SystemExit('no')
d = 0
end = -1
for i,ch in enumerate(s[a:], start=a):
    if ch == '[': d += 1
    elif ch == ']':
        d -= 1
        if d == 0:
            end = i; break
if end < 0: raise SystemExit('no')
code = s[a:end+1]
# replace unquoted keys? but they look quoted in actual JS objects in this build
# try to fix common issues - but better to use ast-like extraction
# simpler: extract each object
# look for { id:
objs = []
# find all positions where object starts
pattern = r'\{\s*id\s*:'  # unquoted key?
# or quoted
pattern2 = r'\{\s*"id"\s*:'
# check
if re.search(pattern2, code):
    pat = pattern2
else:
    pat = pattern
for m in re.finditer(pat, code):
    start = m.start()
    d2 = 0
    in_str = None
    esc = False
    for k,ch in enumerate(code[start:], start=start):
        if in_str:
            if esc: esc = False; continue
            if ch == '\\': esc = True; continue
            if ch == in_str: in_str = None; continue
            continue
        else:
            if ch == '"' or ch == "'": in_str = ch; continue
            if ch == '{': d2 += 1
            elif ch == '}':
                d2 -= 1
                if d2 == 0:
                    objs.append(code[start:k+1])
                    break
print(len(objs))
