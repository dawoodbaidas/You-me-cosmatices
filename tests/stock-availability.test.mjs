import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { modules } from './helpers/load-app.mjs'
import { storeDatabase } from './helpers/store-database.mjs'

const load = modules()
const { cartLineLimit, resolveCart, canCheckoutCart, isProductOutOfStock } = load('@/lib/cart')
const { checkoutLines } = load('@/lib/checkout')
const { validateProduct } = load('@/lib/products/editor')
const { mapProduct } = load('@/lib/products/map')
const product = {
  id: randomUUID(), updatedAt: '2026-11-07T00:00:00Z', slug: 'stock-item', nameAr: 'منتج اختبار', nameEn: 'Stock item',
  category: 'care', categoryLabel: 'العناية', description: null, badge: null, benefits: [],
  price: 5, oldPrice: null, originalPrice: 5, discountEnabled: false, imageUrl: '/products/body-mist.png',
  isActive: true, isFeatured: true, stockQuantity: 5, isOutOfStock: false, variants: [], categorySlugs: [],
}
const draft = {
  id: product.id, updatedAt: null, slug: product.slug, name_ar: product.nameAr, name_en: product.nameEn,
  category: 'care', category_label: 'العناية', description: null, badge: null, benefits: [], price: 5, old_price: null,
  is_active: true, is_featured: true, sort_order: 0, stock_quantity: 5, variants: [],
}

test('stock override blocks every variant and checkout while preserving visible cart lines and recorded quantity', () => {
  for (const stockQuantity of [null, 0, 5]) for (const isOutOfStock of [false, true]) {
    const current = { ...product, stockQuantity, isOutOfStock }
    const items = [{ productId: current.id, variantId: null, quantity: 1 }]
    const unavailable = isOutOfStock || stockQuantity === 0
    assert.equal(isProductOutOfStock(current), unavailable)
    assert.equal(cartLineLimit(current, [], null), unavailable ? 0 : stockQuantity ?? 99)
    const lines = resolveCart(items, [current])
    assert.equal(lines.length, 1, 'sold-out items stay visible for removal')
    assert.equal(canCheckoutCart(lines), !unavailable)
    if (unavailable) assert.throws(() => checkoutLines(items, [current]), /unavailable/)
    else assert.equal(checkoutLines(items, [current]).length, 1)
    assert.equal(current.stockQuantity, stockQuantity)
  }
  const variants = [{ id: 'v1', price: 5, isActive: true }, { id: 'v2', price: 5, isActive: true }]
  for (const variant of variants) assert.equal(cartLineLimit({ ...product, isOutOfStock: true, variants }, [], variant.id), 0)
  assert.equal(cartLineLimit({ ...product, variants }, [], 'removed'), 0)
  assert.equal(cartLineLimit({ ...product, isActive: false }, [], null), 0)
  assert.throws(() => validateProduct({ ...draft, is_out_of_stock: 'false' }), /توفر/)
  assert.throws(() => validateProduct({ ...draft, is_out_of_stock: null }), /توفر/)
  validateProduct({ ...draft, is_out_of_stock: true })
  assert.equal(mapProduct({ ...draft, image_url: null, is_out_of_stock: true }).isOutOfStock, true)
})

test('stock UI renders Arabic controls, overlay badges, disabled purchase actions and cart warnings on every surface', () => {
  const ui = modules({
    'next/navigation': { usePathname: () => '/category/all', useRouter: () => ({ push() {}, refresh() {} }) },
    '@/app/admin/actions': { moveProducts() {}, setProductAvailability() {} },
    [resolve('src/components/BoutiqueDialog')]: { __esModule: true, default: ({ children }) => createElement('div', null, children) },
    [resolve('src/components/admin/ProductImageEditor')]: { __esModule: true, default: () => null },
  })
  const sold = { ...product, isOutOfStock: true }
  const settings = { currency: 'JOD', whatsappNumber: '', storeFreeShippingThreshold: 0 }
  const render = (name, props) => renderToStaticMarkup(createElement(ui(name).default, props))
  const card = render('@/components/ProductCard', { product: sold, currency: 'JOD', eager: false, quantity: 0, isFavorite: false, selectedVariantId: null })
  assert.match(card, /نفد من المخزون/)
  assert.match(card, /<button[^>]*data-price-tag[^>]*disabled/)
  for (const inline of [false, true]) for (const inventory of [false, true]) {
    const detail = render('@/components/ProductQuickView', { product: sold, inline, inventory, cartItems: [], settings, currency: 'JOD', selectedVariantId: null })
    const buy = detail.match(/<button\b[^>]*>/g).find(tag => tag.includes('quickview-buy'))
    assert.match(buy, /disabled/)
    assert.match(detail, /نفد من المخزون/)
  }
  const hero = render('@/components/Hero', { products: [sold], currency: 'JOD' })
  assert.match(hero, /نفد من المخزون/)
  assert.match(hero, /data-hero-product/, 'sold-out selected Hero remains visible')
  const best = render('@/components/BestSellers', { products: [sold], currency: 'JOD' })
  assert.match(best, /<button disabled="">نفد من المخزون/)
  const lines = resolveCart([{ productId: sold.id, variantId: null, quantity: 1 }], [sold])
  const page = render('@/components/CartPage', { lines, settings })
  assert.match(page, /role="alert"/)
  assert.match(page, /نفد من المخزون/)
  assert.ok(page.match(/<button\b[^>]*>/g).some(tag => tag.includes('cta') && tag.includes('disabled')))
  const drawer = render('@/components/CartDrawer', { lines, settings, open: true, side: 'right' })
  assert.match(drawer, /role="alert"/)
  assert.match(drawer, /<button class="cart-checkout" disabled/)
  const admin = render('@/components/admin/ProductManager', { products: [sold], total: 1, page: 1, initialQuery: '', categories: [], currency: 'JOD' })
  assert.match(admin, /role="switch" aria-checked="true"/)
  assert.match(admin, /إلغاء نفاد المخزون/)
  const Editor = ui('@/components/admin/ProductManager').FullProductEditor
  const editor = renderToStaticMarkup(createElement(Editor, { product: sold, categories: [] }))
  assert.match(editor, /name="is_out_of_stock"[^>]*checked/)
  assert.match(editor, /دون إخفاء المنتج أو تغيير الكمية/)
})

test('stock migration, admin concurrency and fresh checkout enforce the override including idempotent retries', async () => {
  const db = await storeDatabase(6)
  try {
    const variants = [0,1].map(i => ({ id: randomUUID(), label: 'نوع '+i, price: 5, is_active: true, sort_order: i }))
    const save = async (patch, version, options = variants) => (await db.query('select admin_save_product($1::jsonb,$2::jsonb,$3) result', [JSON.stringify({ ...draft, ...patch }), JSON.stringify(options), version])).rows[0].result
    const before = await save({}, null)
    await db.exec('reset role')
    await db.exec(await readFile(new URL('../supabase/migrations/007_product_availability.sql', import.meta.url), 'utf8'))
    await db.exec('set role authenticated')
    await db.query("insert into site_settings(key,value) values('store_shipping_fee','0') on conflict(key) do update set value='0'")
    const row = async () => (await db.query('select *,updated_at::text version from products where id=$1', [draft.id])).rows[0]
    assert.equal((await row()).is_out_of_stock, false)
    assert.equal((await row()).stock_quantity, 5)
    let saved = await save({ is_out_of_stock: true }, before.updated_at)
    assert.equal((await row()).stock_quantity, 5)
    assert.equal((await row()).is_active, true)
    assert.equal((await row()).is_out_of_stock, true)
    await assert.rejects(save({ is_out_of_stock: false }, before.updated_at), /Product changed/)
    await assert.rejects(save({ is_out_of_stock: 'false' }, saved.updated_at), /Invalid availability/)
    const payload = [{ productId: draft.id, variantId: variants[0].id, quantity: 1, unitPrice: 5 }]
    const order = async (id = randomUUID(), input = payload, total = 5) => (await db.query('select create_store_order($1,$2::jsonb,$3) result', [id, JSON.stringify(input), total])).rows[0].result
    await db.exec('set role anon')
    const display = (await db.query('select get_store_catalogue(null) result')).rows[0].result
    assert.equal(display.products[0].is_out_of_stock, true, 'unavailable products stay public')
    await assert.rejects(order(), /Product unavailable/)
    await assert.rejects(db.query('update products set is_out_of_stock=false where id=$1', [draft.id]))
    await db.exec('set role authenticated')
    saved = await save({ is_out_of_stock: false, stock_quantity: 0 }, saved.updated_at)
    await assert.rejects(order(), /Stock unavailable/)
    saved = await save({ is_out_of_stock: false, stock_quantity: null }, saved.updated_at)
    const token = randomUUID()
    const original = await order(token)
    assert.equal(original.lines.length, 1)
    assert.equal(original.changed, undefined, 'the accepted quote creates an order, not just a changed-price preview')
    saved = await save({ is_out_of_stock: true, stock_quantity: null }, saved.updated_at)
    await assert.rejects(order(token), /Product unavailable/, 'existing order tokens cannot bypass the current override')
    saved = await save({ is_out_of_stock: false, stock_quantity: 0 }, saved.updated_at)
    await assert.rejects(order(token), /Stock unavailable/)
    saved = await save({ is_out_of_stock: false, stock_quantity: 5 }, saved.updated_at)
    await db.query('update product_variants set price=6 where id=$1', [variants[0].id])
    assert.deepEqual(await order(token), original, 'valid retries retain the immutable original snapshot')
    assert.equal((await order()).changed, true, 'fresh orders require acceptance of changed prices')
    await assert.rejects(order(token, [{ ...payload[0], quantity: 2 }], 10), /another cart/)
    await db.query('update product_variants set is_active=false where id=$1', [variants[0].id])
    await assert.rejects(order(token), /Variant unavailable/)
    await db.query('update product_variants set is_active=true,price=5 where id=$1', [variants[0].id])
    await assert.rejects(order(randomUUID(), [...payload, ...payload], 10), /Duplicate line/)
    await assert.rejects(order(randomUUID(), variants.map(v => ({ ...payload[0], variantId: v.id, quantity: 3 })), 30), /Stock unavailable/)
    assert.equal((await db.query('select count(*)::int n from store_orders')).rows[0].n, 1)

    // The quick toggle uses the same authenticated RLS write with a version check
    // and only invalidates the public cache after a confirmed committed update.
    let authorized = true, invalidations = 0
    const actions = modules({
      '@/lib/auth': { isAdmin: async () => authorized },
      '@/lib/store-cache': { invalidateStoreCatalogue: () => invalidations++ },
      '@/lib/supabase/server': { createClient: async () => ({ from: () => ({ update: patch => {
        const where = {}
        const builder = { eq(key, value) { where[key] = value; return builder }, select() { return builder }, async single() {
          const result = await db.query('update products set is_out_of_stock=$1 where id=$2 and updated_at=$3 returning id', [patch.is_out_of_stock, where.id, where.updated_at])
          return { error: result.rows.length ? null : { code: '40001' } }
        } }
        return builder
      } }) }) },
    })('@/app/admin/actions')
    const version = (await row()).version
    assert.equal((await actions.setProductAvailability(draft.id, true, version)).ok, true)
    assert.equal((await row()).stock_quantity, 5)
    assert.equal((await row()).is_out_of_stock, true)
    assert.equal(invalidations, 1)
    assert.equal((await actions.setProductAvailability(draft.id, false, version)).ok, false)
    assert.equal(invalidations, 1)
    authorized = false
    assert.equal((await actions.setProductAvailability(draft.id, false, (await row()).version)).ok, false)
    assert.equal(invalidations, 1)
    await db.query("select set_config('test.jwt',$1,false)", [JSON.stringify({ email: 'outsider@example.com', app_metadata: { role: 'admin' } })])
    assert.equal((await db.query('update products set is_out_of_stock=false where id=$1 returning id', [draft.id])).rows.length, 0)
    await assert.rejects(save({ is_out_of_stock: false }, (await row())?.version ?? saved.updated_at), /Admin access required/)
  } finally { await db.close() }
})
