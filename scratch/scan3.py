path='You-Cosmetics.html'
with open(path,encoding='utf-8',errors='ignore') as f:
    s=f.read()
# get unique product ids properly
# look in the products array section
# find from $S to end of that array
start=s.find('$S')
a=s.find('[',start)
d=0; end=-1
for i,ch in enumerate(s[a:], start=a):
    if ch=='[': d+=1
    elif ch==']':
        d-=1
        if d==0:
            end=i; break
region=s[a:end+1]
# find all id:"..."
import re
ids=re.findall(r'id\s*:\s*"([^"]+)"', region)
# dedupe
seen=set(); res=[]
for x in ids:
    if x not in seen:
        seen.add(x); res.append(x)
# filter out non-product-like ids
res=[r for r in res if not r in ['skincare','makeup','lips','mist','packages','bestseller','skincare-body']]
print(len(res))
for r in res:
    print(r)
