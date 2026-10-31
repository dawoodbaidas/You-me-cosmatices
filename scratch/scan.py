path='You-Cosmetics.html'
with open(path,encoding='utf-8',errors='ignore') as f:
    s=f.read()
# look for the actual products in the bundled code by finding pattern id:" 
# count
import re
c=re.findall(r'id\s*:\s*"[^"]+"', s)
print(len(c))
print(c[0], c[-1])
