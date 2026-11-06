import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { storeDatabase } from './helpers/store-database.mjs'
import { modules } from './helpers/load-app.mjs'
import { approvedProductImage, originalProductImage } from '../src/lib/products/images.ts'
import { validateProduct } from '../src/lib/products/editor.ts'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const draft = (patch = {}) => ({ id: randomUUID(), updatedAt: null, slug: `product-${randomUUID()}`, name_ar: 'منتج', name_en: 'Product', description: null, category: 'care', category_label: 'عناية', price: 8, old_price: 10, original_price: 10, discount_enabled: true, is_new: true, badge: null, benefits: [], is_active: true, is_featured: false, sort_order: 0, category_slugs: [], stock_quantity: 10, variants: [], ...patch })
const save = (db, p) => db.query('select admin_save_product($1::jsonb,$2::jsonb,$3) result', [JSON.stringify(p), JSON.stringify(p.variants), p.updatedAt])

test('004 migrates existing selections/prices/new flags without losing products or effective variant prices', async () => {
  const db = await storeDatabase(3)
  try {
    const p = draft({ slug: 'body-mist', image_url: '/products/body-mist.webp', badge: 'new', variants: [{ id: randomUUID(), label: 'A', price: 8, is_active: true, sort_order: 0 }] })
    await save(db, p)
    const plain = draft({ price: 3, old_price: null, variants: [] })
    await save(db, plain)
    await db.exec('reset role')
    await db.exec(await readFile(new URL('../supabase/migrations/004_admin_merchandising.sql', import.meta.url), 'utf8'))
    const catalogue = (await db.query('select get_store_catalogue(null) result')).rows[0].result
    assert.equal(catalogue.products.length, 2)
    const row = catalogue.products.find(row => row.id === p.id)
    assert.equal(Number(row.price), 8)
    assert.equal(Number(row.original_price), 10)
    assert.equal(row.is_new, true)
    assert.equal(row.discount_enabled, true)
    assert.equal(Number(row.product_variants[0].price), 10)
    assert.deepEqual(catalogue.home_sections.hero, [p.id])
    assert.deepEqual(catalogue.home_sections.bestsellers, [p.id])
    assert.equal(catalogue.products.find(row => row.id === plain.id).discount_enabled, false)
  } finally { await db.close() }
})

test('category deletion and bulk move are atomic, preserve products, validate targets and enforce admin RLS', async () => {
  const db = await storeDatabase()
  try {
    await db.exec("insert into store_categories(slug,name_ar) values('care','عناية'),('other','آخر'); insert into store_categories(slug,name_ar,parent_slug) values('child','فرعي','care')")
    const p = draft({ category_slugs: ['care', 'child'] })
    await save(db, p)
    const version = (await db.query("select updated_at from store_categories where slug='care'")).rows[0].updated_at
    await assert.rejects(db.query('select admin_delete_category($1,$2,$3)', ['care', version, 'missing']))
    await assert.rejects(db.query('select admin_delete_category($1,$2,$3)', ['care', version, 'care']))
    assert.equal((await db.query('select count(*) from product_categories')).rows[0].count, 2)
    await db.query('select admin_delete_category($1,$2,$3)', ['care', version, 'other'])
    assert.equal((await db.query('select count(*) from products')).rows[0].count, 1)
    assert.deepEqual((await db.query('select category_slug from product_categories order by category_slug')).rows, [{ category_slug: 'child' }, { category_slug: 'other' }])
    assert.equal((await db.query("select parent_slug from store_categories where slug='child'")).rows[0].parent_slug, 'other')
    await assert.rejects(db.query('select admin_move_products($1,$2)', [[p.id, randomUUID()], 'child']))
    assert.equal((await db.query('select count(*) from product_categories')).rows[0].count, 2)
    await db.query('select admin_move_products($1,$2)', [[p.id], 'child'])
    const childVersion = (await db.query("select updated_at from store_categories where slug='child'")).rows[0].updated_at
    await db.query('select admin_delete_category($1,$2,null)', ['child', childVersion])
    assert.equal((await db.query('select count(*) from products')).rows[0].count, 1)
    assert.equal((await db.query('select count(*) from product_categories')).rows[0].count, 0)
    assert.equal((await db.query('select get_store_catalogue(null) result')).rows[0].result.products.length, 1)
    await db.query("select set_config('test.jwt','{}',false)")
    await assert.rejects(db.query('select admin_move_products($1,$2)', [[p.id], null]))
    await assert.rejects(db.query("select admin_save_home_section('hero',$1,now())", [[p.id]]))
  } finally { await db.close() }
})

test('homepage lists preserve order, allow shared products, reject duplicates/stale saves and remain empty after reload', async () => {
  const db = await storeDatabase()
  try {
    const a = draft({ image_url: '/a.png' }), b = draft({ image_url: '/b.png' })
    await save(db, a); await save(db, b)
    const version = section => db.query('select updated_at from home_sections where section=$1', [section]).then(result => result.rows[0].updated_at)
    const original = await version('hero')
    await assert.rejects(db.query('select admin_save_home_section($1,$2,$3)', ['hero', [a.id, a.id], original]))
    await db.query('select admin_save_home_section($1,$2,$3)', ['hero', [b.id, a.id], original])
    await assert.rejects(db.query('select admin_save_home_section($1,$2,$3)', ['hero', [a.id], original]))
    await db.query('select admin_save_home_section($1,$2,$3)', ['bestsellers', [a.id, b.id], await version('bestsellers')])
    let catalogue = (await db.query('select get_store_catalogue(null) result')).rows[0].result
    assert.deepEqual(catalogue.home_sections, { hero: [b.id, a.id], bestsellers: [a.id, b.id] })
    await db.query('select admin_save_home_section($1,$2,$3)', ['hero', [], await version('hero')])
    catalogue = (await db.query('select get_store_catalogue(null) result')).rows[0].result
    assert.deepEqual(catalogue.home_sections.hero, [])
    const { selectedSceneProducts } = modules()('@/lib/scene-products')
    assert.deepEqual(selectedSceneProducts([a], [], 'hero'), [])
    assert.deepEqual(selectedSceneProducts([{ ...a, imageUrl: '/a.png', isActive: false }], [a.id], 'hero'), [])
    assert.equal((await db.query('select count(*) from products')).rows[0].count, 2)
  } finally { await db.close() }
})

test('discount validation and fresh checkout match cart prices; cancelled discounts restore originals and old orders remain unchanged', async () => {
  const db = await storeDatabase()
  const load = modules()
  const { mapProduct } = load('@/lib/products/map')
  const { resolveCart, cartTotal } = load('@/lib/cart')
  try {
    await db.exec("insert into site_settings(key,value) values('currency','JOD'),('store_shipping_fee','2.5') on conflict(key) do update set value=excluded.value")
    const p = draft({ variants: [{ id: randomUUID(), label: 'نوع', price: 12, is_active: true, sort_order: 0 }] })
    validateProduct(p)
    for (const patch of [{ original_price: 0 }, { price: 10 }, { price: -1 }, { price: NaN }, { price: 9.0001 }, { price: null }]) {
      assert.throws(() => validateProduct({ ...p, ...patch }))
      await assert.rejects(save(db, { ...p, ...patch }))
    }
    await save(db, p)
    const read = async () => {
      const data = (await db.query('select get_store_catalogue(null) result')).rows[0].result
      return mapProduct(data.products[0])
    }
    let product = await read()
    const items = [{ productId: p.id, variantId: p.variants[0].id, quantity: 2 }]
    let lines = resolveCart(items, [product])
    assert.equal(lines[0].unitPrice, 9.6)
    const id = randomUUID()
    const order = async (price, total) => (await db.query('select create_store_order($1,$2::jsonb,$3) result', [id, JSON.stringify([{ ...items[0], unitPrice: price }]), total])).rows[0].result
    const quote = await order(12, 26.5)
    assert.equal(quote.changed, true)
    assert.equal(quote.total, cartTotal(lines) + 2.5)
    assert.equal((await db.query('select count(*) from store_orders')).rows[0].count, 0)
    const saved = await order(quote.lines[0].unitPrice, quote.total)
    assert.equal(saved.changed, undefined)
    assert.equal(saved.lines[0].unitPrice, lines[0].unitPrice)
    assert.equal((await db.query('select unit_price from store_order_items')).rows[0].unit_price, '9.600')
    await save(db, { ...p, updatedAt: product.updatedAt, price: 10, old_price: null, discount_enabled: false, is_new: false })
    product = await read()
    lines = resolveCart(items, [product])
    assert.equal(product.price, 10)
    assert.equal(product.oldPrice, null)
    assert.equal(lines[0].unitPrice, 12)
    assert.equal((await order(12, 26.5)).total, saved.total, 'idempotent retry returns original purchase')
    assert.equal((await db.query('select count(*) from store_orders')).rows[0].count, 1)
    await assert.rejects(db.query('update store_order_items set unit_price=0'))
    await db.exec('set role anon')
    await assert.rejects(db.query('select * from store_orders'))
    const freshQuote = (await db.query('select create_store_order($1,$2::jsonb,$3) result', [randomUUID(), JSON.stringify([{ ...items[0], unitPrice: 9.6 }]), 21.7])).rows[0].result
    assert.equal(freshQuote.changed, true)
    assert.equal(freshQuote.lines[0].unitPrice, 12)
    await assert.rejects(db.query('select create_store_order($1,$2::jsonb,$3)', [randomUUID(), JSON.stringify([{ ...items[0], quantity: 11, unitPrice: 12 }]), 134.5]))
  } finally { await db.close() }
})

test('approved WebP preserves alpha and resolution, accepts originals and rejects opaque processed results', async () => {
  const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'white' } }).webp().toBuffer()
  const alpha = Buffer.alloc(20 * 20 * 4)
  for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) { const i = (y * 20 + x) * 4; alpha[i] = 220; alpha[i + 3] = 255 }
  const cutout = await sharp(alpha, { raw: { width: 20, height: 20, channels: 4 } }).webp().toBuffer()
  const output = await approvedProductImage(cutout, true)
  const stats = await sharp(output).stats()
  assert.equal((await sharp(output).metadata()).format, 'webp')
  assert.equal(stats.channels[3].min, 0)
  assert.equal(stats.channels[3].max, 255)
  assert.deepEqual((await originalProductImage(input)).bytes, input)
  await assert.rejects(approvedProductImage(input, true))
  assert.equal((await sharp(await approvedProductImage(input, false)).metadata()).format, 'webp')
  const empty = await sharp({ create: { width: 20, height: 20, channels: 4, background: '#00000000' } }).webp().toBuffer()
  await assert.rejects(approvedProductImage(empty, true))
  await assert.rejects(approvedProductImage(Buffer.from('invalid'), true))
})

test('rendered product cards place new/discount badges correctly in all four combinations and retain the hanging price tag', () => {
  const load = modules({ 'next/navigation': { usePathname: () => '/category/all' } })
  const ProductCard = load('@/components/ProductCard').default
  const { mapProduct } = load('@/lib/products/map')
  const product = mapProduct({ ...draft(), product_variants: [], image_url: null })
  for (const [isNew, discountEnabled] of [[false, false], [true, false], [false, true], [true, true]]) {
    const html = renderToStaticMarkup(createElement(ProductCard, { product: { ...product, isNew, discountEnabled, price: discountEnabled ? 8 : 10, oldPrice: discountEnabled ? 10 : null }, currency: 'JOD', eager: false, quantity: 0, isFavorite: false, selectedVariantId: null, onSelectVariant() {}, onToggleFavorite() {}, onAddToCart() {}, onOpenDetails() {} }))
    assert.ok(html.includes('data-price-tag'))
    assert.equal(html.includes('class="badge"'), isNew || discountEnabled)
    assert.equal(html.includes('class="newBadge"'), isNew && discountEnabled)
    assert.equal(html.includes('-20%'), discountEnabled)
    assert.equal(html.includes('<del>10</del>'), discountEnabled)
    if (isNew && !discountEnabled) assert.ok(html.includes('class="badge">جديد</span>'))
  }
})

test('image upload preserves the existing link on upload/save failure, cleans new orphans, and denies unauthorized processing/writes', async () => {
  const base = 'https://test.supabase.co'
  const p = draft()
  const current = `${base}/storage/v1/object/public/product-images/products/${p.id}/${randomUUID()}.webp`
  let linked = current, uploaded = null, authorized = true, uploadFails = false, saveFails = false
  const removed = []
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } }).png().toBuffer()
  const client = {
    storage: { from: () => ({
      async upload(path, bytes, options) { if (uploadFails) return { error: { code: 'fail' } }; uploaded = { path, bytes, options }; return { error: null } },
      getPublicUrl: path => ({ data: { publicUrl: `${base}/storage/v1/object/public/product-images/${path}` } }),
      async remove(paths) { removed.push(...paths); return { error: null } },
    }) },
    from: () => ({ select: () => ({ eq: async (_, url) => ({ count: linked === url ? 1 : 0, error: null }) }) }),
    async rpc(_, payload) { if (saveFails) return { error: { code: '23514' } }; const previous_image = linked; linked = payload.p_product.image_url ?? linked; return { data: { previous_image }, error: null } },
  }
  const load = modules({ '@/lib/auth': { getViewer: async () => ({ user: authorized ? { id: 'test' } : null, admin: authorized }) }, '@/lib/supabase/server': { createClient: async () => client }, '@/lib/store-cache': { invalidateStoreCatalogue() {} } }, { NEXT_PUBLIC_SUPABASE_URL: base })
  const api = load('@/app/api/admin/products/route')
  const removal = load('@/app/api/admin/products/remove-background/route')
  const request = (url = '/api/admin/products') => {
    const body = new FormData(); body.set('product', JSON.stringify(p)); body.set('image', new File([image], 'photo.png', { type: 'image/png' })); body.set('image_confirmed', 'true')
    return new Request('https://store.test' + url, { method: 'POST', body, headers: { origin: 'https://store.test', host: 'store.test' } })
  }
  uploadFails = true
  assert.equal((await api.POST(request())).status, 400)
  assert.equal(linked, current)
  uploadFails = false; saveFails = true
  assert.equal((await api.POST(request())).status, 409)
  assert.equal(linked, current)
  assert.ok(removed.includes(uploaded.path))
  assert.deepEqual(await sharp(uploaded.bytes).raw().toBuffer(), await sharp(image).raw().toBuffer())
  assert.equal(uploaded.options.contentType, 'image/webp')
  saveFails = false
  assert.equal((await api.POST(request())).status, 200)
  assert.notEqual(linked, current)
  assert.ok(removed.some(path => current.endsWith(path)))
  authorized = false
  assert.equal((await api.POST(request())).status, 403)
  assert.equal((await removal.POST(request('/api/admin/products/remove-background'))).status, 403)
})

test('server checkout returns a changed quote before saving and builds WhatsApp from the accepted immutable database snapshot', async () => {
  const db = await storeDatabase()
  try {
    await db.exec("insert into site_settings(key,value) values('currency','JOD'),('whatsapp_number','962700000000'),('store_shipping_fee','2.5') on conflict(key) do update set value=excluded.value")
    const p = draft(); await save(db, p)
    const load = modules({
      '@/lib/store-catalogue': { readStoreCatalogue: async () => {
        const catalogue = (await db.query('select get_store_catalogue(null) result')).rows[0].result
        return { products: catalogue.products.map(row => load('@/lib/products/map').mapProduct(row)), revision: '1', settings: { currency: 'JOD', whatsappNumber: '962700000000' } }
      } },
      '@/lib/supabase/server': { createClient: async () => ({ rpc: async (_, args) => ({ data: (await db.query('select create_store_order($1,$2::jsonb,$3) result', [args.p_id, JSON.stringify(args.p_lines), args.p_expected_total])).rows[0].result }) }) },
    })
    const checkout = load('@/app/checkout').prepareCheckout
    const id = randomUUID(), items = [{ productId: p.id, variantId: null, quantity: 2 }]
    const changed = await checkout(items, { id, unitPrices: [10], total: 22.5 })
    assert.equal(changed.confirmation.total, 18.5)
    assert.equal(changed.url, undefined)
    assert.equal((await db.query('select count(*) from store_orders')).rows[0].count, 0)
    const result = await checkout(items, { id, unitPrices: [8], total: 18.5 })
    const message = new URL(result.url).searchParams.get('text')
    assert.ok(message.includes('8.00'))
    assert.ok(message.includes('18.50'))
    assert.ok(message.includes(id))
    assert.equal((await db.query('select count(*) from store_orders')).rows[0].count, 1)
    const cart = load('@/lib/cart')
    const remembered = cart.addToCart([], p.id, null, 1, 10)
    const restored = cart.readStoredCart({ getItem: () => JSON.stringify(remembered) })
    assert.equal(restored[0].unitPrice, 10)
    assert.equal(cart.resolveCart(restored, [load('@/lib/products/map').mapProduct((await db.query('select get_store_catalogue(null) result')).rows[0].result.products[0])])[0].unitPrice, 8)
  } finally { await db.close() }
})
