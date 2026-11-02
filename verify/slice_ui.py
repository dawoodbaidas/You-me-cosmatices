import os
BASE = os.path.dirname(os.path.abspath(__file__))
lines = open(os.path.join(BASE, 'ui_readable.txt'), encoding='utf-8').read().split('\n')
out = []
for i, line in enumerate(lines[:262], start=1):
    out.append(f'{i:>4}: {line}')
open(os.path.join(BASE, 'ui_part1.txt'), 'w', encoding='utf-8').write('\n'.join(out))
print('lines', len(lines))
