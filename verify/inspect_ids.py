import json, os
BASE = os.path.dirname(os.path.abspath(__file__))
prods = json.load(open(os.path.join(BASE, 'products_from_html.json'), encoding='utf-8'))
print('type', type(prods).__name__, 'len', len(prods))
first = prods[0] if isinstance(prods, list) else list(prods.values())[0]
print('keys:', list(first.keys()))
print('sample:', json.dumps({k: first[k] for k in list(first.keys()) if k != 'imageData'}, ensure_ascii=False)[:600])
print()
for p in prods:
    img = p.get('image', '')
    print(f"{p['id']:<42} {p['category']:<14} {p.get('price')!s:>6} {img}")
