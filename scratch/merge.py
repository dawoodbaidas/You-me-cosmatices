import json
import os

prices = json.load(open('C:/Users/ONE BY ONE/Desktop/projects/Web/web/you-and-me-prices.json', encoding='utf-8'))
prods = json.load(open('C:/Users/ONE BY ONE/Desktop/projects/Web/web/products_from_html.json', encoding='utf-8'))

for p in prods:
    pid = p['id']
    if pid in prices:
        pr = prices[pid]
        if 'price' in pr:
            p['price'] = pr['price']
        if 'variantPrices' in pr and p.get('variants'):
            vp = pr['variantPrices']
            for v in p['variants']:
                if v['label'] in vp:
                    v['price'] = vp[v['label']]

out = 'C:/Users/ONE BY ONE/Desktop/projects/Web/web/web-app/src/data'
os.makedirs(out, exist_ok=True)
json.dump(prods, open(os.path.join(out, 'products.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(len(prods))
