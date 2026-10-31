path = 'You-Cosmetics.html'
with open(path, encoding='utf-8', errors='ignore') as f:
    s = f.read()
start = s.find('$S')
a = s.find('[', start)
d = 0
end = -1
for i,ch in enumerate(s[a:], start=a):
    if ch == '[': d+=1
    elif ch == ']':
        d-=1
        if d==0:
            end=i; break
code = s[a:end+1]
import re
ids = re.findall(r'"id"\s*:\s*"([^"]+)"', code)
print(len(ids))
print(ids[0])
print(ids[-1])
