import test from 'node:test'
import assert from 'node:assert/strict'
import { modules } from './helpers/load-app.mjs'

test('home selection and product requests do not wait for unrelated navigation rows', async () => {
  const original = globalThis.fetch
  const calls = []
  let release
  const navigation = new Promise(resolve => { release = resolve })
  const load = modules({ react: { cache: fn => fn }, 'next/cache': { unstable_cache: fn => fn } }, {
    NEXT_PUBLIC_SUPABASE_URL: 'https://db.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  })
  globalThis.fetch = async input => {
    const url = new URL(input)
    calls.push(url.pathname)
    if (url.pathname.endsWith('store_revision')) return Response.json([{ version: 1 }])
    if (url.pathname.endsWith('store_categories') || url.pathname.endsWith('site_settings')) { await navigation; return Response.json([]) }
    if (url.pathname.endsWith('home_section_products')) return Response.json([{ section: 'hero', product_id: 'a', position: 0 }])
    assert.ok(!url.searchParams.get('select').includes('*'))
    return Response.json([])
  }
  try {
    const home = load('@/lib/store-catalogue').getStoreHome()
    await new Promise(resolve => setImmediate(resolve))
    assert.ok(calls.includes('/rest/v1/products'), 'products start while chrome is still waiting')
    release()
    assert.deepEqual((await home).homeSections.hero, ['a'])
  } finally { release(); globalThis.fetch = original }
})

test('category intent deduplicates requests, cancels obsolete work and sends no priced payload', async () => {
  const { prefetchCategory } = modules()('@/lib/prefetch-category')
  const calls = []
  const request = (url, options) => new Promise(resolve => calls.push({ url, options, resolve }))
  prefetchCategory('one', request)
  prefetchCategory('one', request)
  assert.equal(calls.length, 1)
  prefetchCategory('two', request)
  assert.equal(calls[0].options.signal.aborted, true)
  assert.equal(calls[1].options.method, 'HEAD')
  assert.equal(calls[1].options.cache, 'no-store')
  calls[1].resolve(new Response(null))
  await new Promise(resolve => setImmediate(resolve))
  prefetchCategory('two', request)
  assert.equal(calls.length, 2)
  calls[0].resolve(new Response(null))
})

test('category warming uses the same filtered public reader and validates category input', async () => {
  const calls = []
  const { GET } = modules({ '@/lib/store-catalogue': { getStoreProducts: async (...args) => {
    calls.push(args)
    return { products: [], revision: '5' }
  } } })('@/app/api/store/products/route')
  const result = await GET(new Request('http://store/api/store/products?category=care'))
  assert.deepEqual(calls, [['category', 'care']])
  assert.equal(result.headers.get('X-Store-Revision'), '5')
  assert.equal(result.headers.get('Cache-Control'), 'no-store')
  assert.equal((await GET(new Request('http://store/api/store/products?category=bad,filter'))).status, 400)
})
