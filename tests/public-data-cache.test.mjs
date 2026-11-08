import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import ts from 'typescript'

function harness() {
  let revision = '1', failing = false
  const requests = [], persisted = new Map(), render = new Map(), loaded = new Map()
  const rows = [{ id: '11111111-1111-1111-1111-111111111111', slug: 'product', name_ar: 'منتج', price: 5, old_price: null, is_active: true, product_variants: [], product_categories: [{ category_slug: 'child' }, { category_slug: 'other' }] }]
  const categories = [{ slug: 'child', name_ar: 'قسم', is_active: true }]
  const fetch = async (url, options) => {
    requests.push({ url, options })
    assert.equal(options.headers.Authorization, 'Bearer public-test')
    if (failing) return new Response('', { status: 503 })
    const path = new URL(url).pathname
    if (path.endsWith('store_revision')) return Response.json([{ version: revision }])
    if (path.endsWith('store_categories')) return Response.json(categories)
    if (path.endsWith('site_settings')) return Response.json([])
    if (path.endsWith('home_section_products')) return Response.json(['hero', 'bestsellers'].map(section => ({ section, product_id: rows[0].id, position: 0 })))
    if (path.endsWith('get_store_catalogue')) return Response.json({ revision, products: rows, categories, settings: [] })
    return Response.json(rows)
  }
  const stubs = {
    react: { cache: fn => (...args) => { let entries = render.get(fn); if (!entries) { entries = new Map(); render.set(fn, entries) } const key = JSON.stringify(args); if (!entries.has(key)) entries.set(key, fn(...args)); return entries.get(key) } },
    'next/cache': { unstable_cache: (fn, keys, options) => async (...args) => { assert.equal(options.revalidate, 30); assert.deepEqual(options.tags, ['store-catalogue']); const key = JSON.stringify([keys, args]); if (!persisted.has(key)) { const value = await fn(...args); persisted.set(key, value) } return persisted.get(key) } },
  }
  const load = path => {
    if (loaded.has(path)) return loaded.get(path)
    const exports = {}
    loaded.set(path, exports)
    const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'exports', 'process', 'fetch', source)(name => stubs[name] ?? load(name.startsWith('@/') ? resolve('src', name.slice(2) + '.ts') : resolve(dirname(path), name + '.ts')), exports, { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test' } }, fetch)
    return exports
  }
  return { api: load(resolve('src/lib/store-catalogue.ts')), requests, next: () => render.clear(), change: () => { revision = String(Number(revision) + 1); rows[0].price++; render.clear() }, fail: () => { failing = true; render.clear() } }
}

test('layout and product reads share one revision request and retain public row cache across renders', async () => {
  const h = harness()
  await Promise.all([h.api.getStoreNavigation(), h.api.getStoreProducts('slug', 'product')])
  assert.equal(h.requests.filter(r => r.url.includes('/store_revision?')).length, 1)
  const first = h.requests.length
  h.next()
  await h.api.getStoreProducts('slug', 'product')
  assert.equal(h.requests.length, first + 1, 'only fresh revision crosses the network')
  h.change()
  const updated = await h.api.getStoreProducts('slug', 'product')
  assert.equal(updated.products[0].price, 6)
  assert.ok(h.requests.length > first + 2)
})

test('narrow category reads keep all memberships and ID cache keys are canonical', async () => {
  const h = harness()
  const data = await h.api.getStoreProducts('category', 'child')
  assert.deepEqual(data.products[0].categorySlugs, ['child', 'other'])
  const url = new URL(h.requests.find(r => r.url.includes('/products?')).url)
  assert.equal(url.searchParams.get('membership.category_slug'), 'eq.child')
  assert.ok(url.searchParams.get('select').includes('product_categories(category_slug),membership:product_categories!inner'))
  await h.api.getStoreProducts('ids', '22222222-2222-2222-2222-222222222222,11111111-1111-1111-1111-111111111111,11111111-1111-1111-1111-111111111111')
  const count = h.requests.length
  await h.api.getStoreProducts('ids', '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222')
  assert.equal(h.requests.length, count)
})

test('homepage selects configured products without fetching catalogue RPC; empty IDs read no products', async () => {
  const h = harness()
  const data = await h.api.getStoreHome()
  assert.equal(data.homeSections.hero.length, 1)
  assert.equal(data.homeSections.bestsellers.length, 1)
  assert.equal(h.requests.filter(r => r.url.includes('/products?')).length, 1)
  assert.equal(h.requests.some(r => r.url.includes('get_store_catalogue')), false)
  const count = h.requests.length
  assert.deepEqual((await h.api.getStoreProducts('ids', '')).products, [])
  assert.equal(h.requests.length, count)
})

test('checkout fresh read bypasses public cache and database failures fail closed', async () => {
  const h = harness()
  await h.api.readStoreCatalogue(true)
  assert.equal(h.requests.find(r => r.url.includes('get_store_catalogue')).options.cache, 'no-store')
  h.fail()
  const data = await h.api.getStoreProducts('slug', 'product')
  assert.equal(data.unavailable, true)
  assert.deepEqual(data.products, [])
})
