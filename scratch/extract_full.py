path = 'You-Cosmetics.html'
with open(path, encoding='utf-8', errors='ignore') as f:
    s = f.read()
# extract const $S array - look for pattern
# actually in the HTML it's $S = [ ... ]
# might be encoded, but we saw snippet
import re
# try to find full products array
m = re.search(r'const \$S\s*=\s*\[([^\]]+)\]', s, re.S)
if not m:
    print('not found')
else:
    print('found', len(m.group(1)))
