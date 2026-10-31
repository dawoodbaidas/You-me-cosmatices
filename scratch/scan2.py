path='You-Cosmetics.html'
with open(path,encoding='utf-8',errors='ignore') as f:
    s=f.read()
# find all products - get distinct ids in the products array context
import re
# look for $S context better
start=s.find('$S')
if start==-1: start=0
end=s.find('contact', start)
# search between
region=s[start:end]
ids=re.findall(r'id\s*:\s*"([^"]+)"', region)
# dedupe
seen=set(); res=[]
for i in ids:
    if i not in seen and i != 'contact':
        seen.add(i); res.append(i)
print(len(res))
for r in res[:10]:
    print(r)
for r in res[-5:]:
    print('...', r)
