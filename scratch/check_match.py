import json
import os
BASE = os.path.dirname(os.path.abspath(__file__))
prices = json.load(open(os.path.join(BASE, 'you-and-me-prices.json'), encoding='utf-8'))
prods = json.load(open(os.path.join(BASE, 'products_from_html.json'), encoding='utf-8'))
html_ids = [p['id'] for p in prods]
print('json keys:', len(prices))
print('html products:', len(html_ids), 'unique:', len(set(html_ids)))
missing = [k for k in prices if k not in html_ids]
print('json keys not in html:', missing)
notin = [i for i in html_ids if i not in prices]
print('html products without json price:', notin)