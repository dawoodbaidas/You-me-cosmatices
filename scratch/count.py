path = 'You-Cosmetics.html'
with open(path, encoding='utf-8', errors='ignore') as f:
    s = f.read()
import re
ids = re.findall(r'id:"([^"]+)"', s)
# dedupe
seen = set()
res = []
for i in ids:
    if i not in seen:
        seen.add(i); res.append(i)
print(len(res))
print('\n'.join(res[:10]))
