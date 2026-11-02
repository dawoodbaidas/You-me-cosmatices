import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
prods = json.load(open(os.path.join(BASE, 'products_from_html.json'), encoding='utf-8'))
prices = json.load(open(os.path.join(BASE, 'you-and-me-prices.json'), encoding='utf-8'))

def q(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"

def num(v):
    if v is None:
        return 'NULL'
    f = float(v)
    if f == int(f):
        return str(int(f))
    return str(f)

L = []
L.append('-- ============================================================')
L.append('-- You & Me Cosmetics - seed data')
L.append('-- Generated from the original website product data.')
L.append('-- JSON prices (you-and-me-prices.json) override HTML prices.')
L.append('-- Decimal JOD values are preserved exactly (7, 3.5, 2.25, 1.25, 0.75).')
L.append('-- ============================================================')
L.append('')
L.append('-- ---------- site_settings ----------')
L.append('INSERT INTO site_settings (key, value) VALUES')
L.append("  ('whatsapp_number', '962777260622'),")
L.append("  ('instagram_url', 'https://www.instagram.com/youandmecosmetics/'),")
L.append("  ('facebook_url', 'https://www.facebook.com/youandmecosmetics/'),")
L.append("  ('store_name', 'You & Me Cosmetics'),")
L.append("  ('contact_email', 'youme.work20@gmail.com')")
L.append('ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();')
L.append('')

variant_count = 0
matched_products = []
unmatched_products = []
unmatched_variants = []

for p in prods:
    pid = p['id']
    if pid in prices:
        matched_products.append(pid)
    else:
        unmatched_products.append(pid)

    pr = prices.get(pid, {})
    price = pr.get('price', p.get('price'))
    old_price = pr.get('oldPrice', p.get('oldPrice'))
    slug = p.get('slug') or pid
    benefits = json.dumps(p.get('benefits') or [], ensure_ascii=False)
    ext = 'png' if os.path.exists(os.path.join(BASE, 'web-app', 'public', 'products', pid + '.png')) else 'jpg'
    image_url = '/products/' + pid + '.' + ext

    L.append('-- [' + str(len(matched_products) + len(unmatched_products)) + '] ' + pid)
    L.append('INSERT INTO products')
    L.append('  (slug, name_ar, name_en, description, category, category_label, price, old_price, badge, image_url, benefits, is_active, sort_order)')
    L.append('VALUES')
    L.append('  ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}::jsonb, true, {})'.format(
        q(slug),
        q(p.get('nameAr')),
        q(p.get('nameEn')),
        q(p.get('description') or p.get('desc')),
        q(p.get('category')),
        q(p.get('categoryLabel')),
        num(price),
        num(old_price),
        q(p.get('badge')),
        q(image_url),
        q(benefits),
        matched_products.index(pid) + len(unmatched_products),
    ))
    L.append('ON CONFLICT (slug) DO UPDATE SET')
    L.append('  price = EXCLUDED.price,')
    L.append('  old_price = EXCLUDED.old_price,')
    L.append('  badge = EXCLUDED.badge,')
    L.append('  image_url = EXCLUDED.image_url,')
    L.append('  benefits = EXCLUDED.benefits,')
    L.append('  updated_at = now();')
    L.append('')

    variants = p.get('variants') or []
    vp = pr.get('variantPrices') or {}
    if variants:
        L.append('DELETE FROM product_variants WHERE product_id = (SELECT id FROM products WHERE slug = {});'.format(q(slug)))
        for j, v in enumerate(variants):
            if vp and v['label'] not in vp:
                unmatched_variants.append(pid + ' :: ' + v['label'])
            vprice = vp.get(v['label'], v.get('price'))
            L.append('INSERT INTO product_variants (product_id, label, price, sort_order, is_active)')
            L.append('SELECT p.id, {}, {}, {}, true FROM products p WHERE p.slug = {};'.format(
                q(v['label']), num(vprice), j, q(slug)))
            variant_count += 1
        L.append('')

json_only = [k for k in prices if k not in {x['id'] for x in prods}]

L.append('-- ============================================================')
L.append('-- Migration report')
L.append('-- products seeded: ' + str(len(prods)))
L.append('-- variant rows seeded: ' + str(variant_count))
L.append('-- products with JSON price override: ' + str(len(matched_products)))
L.append('-- products kept at HTML price (no JSON entry): ' + str(len(unmatched_products)))
if unmatched_products:
    L.append('--   ' + ', '.join(unmatched_products))
L.append('-- JSON keys with no matching HTML product (NOT seeded): ' + str(len(json_only)))
if json_only:
    L.append('--   ' + ', '.join(json_only))
L.append('-- variant labels in JSON with no matching HTML variant label: ' + str(len(unmatched_variants)))
if unmatched_variants:
    for uv in unmatched_variants:
        L.append('--   ' + uv)
L.append('-- ============================================================')

out = os.path.join(BASE, 'web-app', 'supabase', 'seed.sql')
with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(L))
print('products:', len(prods), 'variants:', variant_count)
print('json keys not in html:', json_only)
print('unmatched variant labels:', unmatched_variants)