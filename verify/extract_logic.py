import os
BASE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(BASE, 'You-Cosmetics.html'), encoding='utf-8', errors='ignore').read()

i = s.find('wa.me/962777260622?text=')
start = s.rfind('HW=', 0, i)
if start == -1:
    start = max(0, i - 4000)
seg = s[start - 6000:i + 3000]
for tok in ['NV=', 'HW=', 'tp=', 'PW=', 'eW=', 'j=', 'K=', 'EU=']:
    seg = seg.replace(tok, '\n### ' + tok + '\n')
with open(os.path.join(BASE, 'logic_readable.txt'), 'w', encoding='utf-8') as f:
    f.write(seg)
print('ok', len(seg))