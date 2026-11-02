import json, re, urllib.request, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
prices = json.load(open(os.path.join(BASE, 'you-and-me-prices.json'), encoding='utf-8'))
catalogue = json.load(open(os.path.join(BASE, 'web-app', 'src', 'data', 'preview-products.json'), encoding='utf-8'))
seed = open(os.path.join(BASE, 'web-app', 'supabase', 'seed.sql'), encoding='utf-8').read()

html = urllib.request.urlopen('http://localhost:3111/', timeout=120).read().decode('utf-8')
flat = html.replace('<!-- -->', '')

failures = []

# ---------------------------------------------------------------- card prices
cards = re.split(r'data-testid="product-', flat)[1:]
by_slug = {p['slug']: p for p in catalogue}
print(f'cards rendered: {len(cards)}')

for card in cards:
    slug = re.match(r'([a-z0-9\-]+)"', card).group(1)
    product = by_slug.get(slug)
    if not product:
        failures.append(f'unknown slug {slug}')
        continue
    money = re.findall(r'>([0-9]+(?:\.[0-9]{2})?) JOD', card)
    if not money:
        failures.append(f'{slug}: no price rendered')
        continue

    first_variant = product['variants'][0]['price'] if product['variants'] else None
    allowed = {round(product['price'], 2)}
    if first_variant is not None:
        allowed.add(round(first_variant, 2))
    rendered = {round(float(m), 2) for m in money}
    if not rendered & allowed:
        failures.append(f'{slug}: rendered {sorted(rendered)} expected one of {sorted(allowed)}')

# variant chips: each card also has one aria-pressed on the favourite button
chips = 0
for card in cards:
    slug = re.match(r'([a-z0-9\-]+)"', card).group(1)
    expected = len(by_slug[slug]['variants'])
    found = len(re.findall(r'aria-pressed="(?:true|false)"', card)) - 1
    chips += found
    if found != expected:
        failures.append(f'{slug}: {found} variant chips, expected {expected}')

# ------------------------------------------------------------ seed contents
print(f'\nseed.sql: products={len(re.findall(r"insert into public.products", seed))} '
      f'variant-blocks={len(re.findall(r"insert into public.product_variants", seed))}')

# every variant row in the seed must carry the JSON price
missing_variant_prices = []
for product in catalogue:
    for variant in product['variants']:
        label = variant['label'].replace("'", "''")
        expected = f"('{label}'::text, {variant['price']}::numeric"
        if expected not in seed:
            missing_variant_prices.append((product['slug'], label, variant['price']))

# --------------------------------------------------------------- page checks
checks = {
    'dir="rtl"': 'dir="rtl"' in flat,
    'lang="ar"': 'lang="ar"' in flat,
    'preview banner shown': 'وضع المعاينة المحلية' in flat,
    'nav: home/shop/story/contact': all(f'data-testid="nav-{k}"' in flat for k in ['home','shop','story','contact']),
    '8 category filters': all(f'data-testid="filter-{k}"' in flat for k in
        ['all','packages','mist','skincare','skincare-body','makeup','lips','bestseller']),
    'tajawal font variable class': '__variable' in flat and 'tajawal' in flat,
    'no Google Fonts request': 'fonts.googleapis.com' not in flat,
    'WhatsApp number': 'wa.me/962777260622' in flat,
    'contact e-mail': 'youme.work20@gmail.com' in flat,
    'cart drawer mounted': 'cart-drawer' in flat,
    'mobile cart bar': 'السلة' in flat,
    'hero heading': 'هنا تبدأ حكاية جمالك' in flat,
    'hero collage images': 'ماسكارا مغذية' in flat and 'Magic Lip Oil' in flat,
    'hero price pill': re.search(r'من\s*3 JOD', flat) is not None,
    'feature strip': 'توصيل سريع في الأردن' in flat and 'دفع عند الاستلام' in flat,
    'story section': 'بدأنا بشغف بسيط' in flat and 'طبيعي 99%' in flat,
    'testimonials': all(n in flat for n in ['رنيم - عمان', 'لين - إربد', 'سارة - الزرقاء']),
    'footer admin link': 'href="/admin"' in flat,
    'footer quick links': 'روابط سريعة' in flat,
    'newsletter form': 'اشتركي بعروض الدلال' in flat,
    'no hardcoded price file leaked': 'you-and-me-prices' not in flat,
    'packages styled as gold': 'border-gold/70' in flat,
}

print()
for name, ok in checks.items():
    print(('  OK  ' if ok else '  FAIL'), name)
    if not ok:
        failures.append(name)

print(f'\nvariant chips rendered: {chips} / {sum(len(p["variants"]) for p in catalogue)}')
print(f'seed variant prices missing: {len(missing_variant_prices)}')
for row in missing_variant_prices[:10]:
    print('  ', row)
    failures.append(str(row))

print()
if failures:
    print(f'FAILURES ({len(failures)}):')
    for f in failures:
        print('  -', f)
else:
    print('ALL CHECKS PASSED')
