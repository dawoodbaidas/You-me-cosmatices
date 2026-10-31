import re, os
s = open('You-Cosmetics.html', encoding='utf-8', errors='ignore').read()
seen = []
for m in re.finditer(r'https://(?:www\.)?(?:facebook|instagram|tiktok)[^\s"\'<>)]*', s):
    u = m.group(0)
    if u not in seen:
        seen.append(u)
print(seen)
print('---- wa.me ----')
w = []
for m in re.finditer(r'https://wa\.me/[0-9]+', s):
    if m.group(0) not in w:
        w.append(m.group(0))
print(w)
print('---- mailto ----')
m2 = []
for m in re.finditer(r'mailto:[^\s"\'<>)]+', s):
    if m.group(0) not in m2:
        m2.append(m.group(0))
print(m2)