import os, sys
BASE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(BASE, 'You-Cosmetics.html'), encoding='utf-8', errors='ignore').read()
i = s.find('J("div",{dir:"rtl"')
seg = s[i:i + 46000]
# insert newlines before common JSX tokens for readability
for tok in ['children:[', ']),J(', '),k(', '),k[', 'className:', 'onClick:']:
    seg = seg.replace(tok, '\n' + tok)
with open(os.path.join(BASE, 'ui_readable.txt'), 'w', encoding='utf-8') as f:
    f.write(seg)
print('written', len(seg))