import re
import json

path = 'You-Cosmetics.html'
with open(path, encoding='utf-8', errors='ignore') as f:
    s = f.read()

# find $S array - get from $S = [ to matching ]
idx = s.find('$S')
if idx == -1:
    raise SystemExit('no')
a = s.find('[', idx)
d = 0
end = -1
for i,ch in enumerate(s[a:], start=a):
    if ch == '[': d+=1
    elif ch == ']':
        d-=1
        if d==0:
            end = i; break
if end < 0: raise SystemExit('no end')
code = s[a:end+1]

# now extract product objects by regex - each object starts with {id: and ends at matching depth of braces
# easier to extract all objects
objs = []
# pattern: {id:"..." ... }
# find all {id:
for m in re.finditer(r'\{\s*"id"\s*:', code):
    start_obj = m.start()
    depth_b = 0
    j = start_obj
    in_str = None
    esc = False
    for k,ch in enumerate(code[start_obj:], start=start_obj):
        if in_str:
            if esc: esc=False; continue
            if ch == '\\': esc=True; continue
            if ch == in_str: in_str=None; continue
            continue
        else:
            if ch == '"' or ch == "'": in_str=ch; continue
            if ch == '{': depth_b+=1
            elif ch == '}':
                depth_b-=1
                if depth_b == 0:
                    # end of object
                    objstr = code[start_obj:k+1]
                    objs.append(objstr)
                    j = k
                    break
    # continue

print(len(objs))
