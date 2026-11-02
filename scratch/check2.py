import json
d = json.load(open('products_from_html.json', encoding='utf-8'))
print(d[0]['id'])
print(d[0]['nameAr'][:15])
