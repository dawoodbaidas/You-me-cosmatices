import test from 'node:test'
import assert from 'node:assert/strict'
import { modules } from './helpers/load-app.mjs'

const load = modules()
const { PublicProductCache } = load('@/lib/public-product-cache')
const { rememberProductImage, loadedProductImage } = load('@/lib/product-media')
const { productSceneAsset } = load('@/lib/scene-products')
const product = (id, imageUrl = '/original.webp', updatedAt = '2026-11-07T01:00:00Z') => ({ id, slug: id, imageUrl, updatedAt, price: 5, variants: [] })
const response = (products, revision) => Response.json(products, { headers: { 'X-Store-Revision': revision } })

test('default browser fetch is invoked without binding it to the cache instance', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = function () {
      assert.ok(this === undefined || this === globalThis, 'native browser fetch rejects a cache instance receiver')
      return Promise.resolve(response([], '1'))
    }
    const cache = new PublicProductCache()
    cache.advance('1')
    await cache.load()
  } finally { globalThis.fetch = previous }
})

test('known cart IDs and quantity-only edits reuse page products; overlapping loads deduplicate by ID', async () => {
  const calls = [], replies = []
  const cache = new PublicProductCache((url) => { calls.push(url); return new Promise(resolve => replies.push(resolve)) })
  cache.seed([product('known')], '9')
  await cache.load(['known'])
  await cache.load(['known', 'known'])
  assert.equal(calls.length, 0)
  const first = cache.load(['known', 'a'])
  const second = cache.load(['a', 'b'])
  assert.equal(calls.length, 2)
  assert.equal(new URL(calls[0], 'https://test').searchParams.get('ids'), 'a')
  assert.equal(new URL(calls[1], 'https://test').searchParams.get('ids'), 'b')
  replies[1](response([product('b')], '9'))
  replies[0](response([product('a')], '9'))
  await Promise.all([first, second])
  await cache.load(['known', 'a', 'b'])
  assert.equal(calls.length, 2)
})

test('revision reconciliation rejects delayed page/search/ID data and invalidates search and image identity together', async () => {
  const replies = []
  const cache = new PublicProductCache(() => new Promise(resolve => replies.push(resolve)))
  const original = product('a')
  cache.seed([original], '9007199254740993')
  rememberProductImage(original.imageUrl, { currentSrc: '/optimized-old', width: 1080, height: 800 })
  const oldSearch = cache.load()
  cache.advance('9007199254740994')
  assert.equal(cache.getSnapshot().searchProducts, null)
  const fresh = product('a', '/replacement.webp', '2026-11-07T02:00:00Z')
  cache.seed([fresh], '9007199254740994')
  cache.seed([original], '9007199254740994')
  cache.seed([original], '9007199254740993')
  replies[0](response([original], '9007199254740993'))
  await oldSearch
  assert.deepEqual(cache.resolve([original], '9007199254740993'), [fresh])
  assert.equal(cache.getSnapshot().searchProducts, null)
  assert.equal(loadedProductImage(fresh.imageUrl), undefined, 'replacement cannot reuse old-source pixels')
  assert.equal(loadedProductImage(original.imageUrl).currentSrc, '/optimized-old')
  // Price/stock-only revisions should preserve correct imagery for an unchanged
  // immutable source; a global revision is not an image URL cache-buster.
  cache.advance('9007199254740995')
  cache.seed([{ ...fresh, price: 6 }], '9007199254740995')
  rememberProductImage(fresh.imageUrl, { currentSrc: '/optimized-new', width: 1080, height: 800 })
  cache.advance('9007199254740996')
  cache.seed([{ ...fresh, price: 7 }], '9007199254740996')
  assert.equal(loadedProductImage(cache.getSnapshot().products[0].imageUrl).currentSrc, '/optimized-new')
  assert.equal(productSceneAsset({ slug: 'body-mist', imageUrl: '/replacement.webp' }), undefined, 'replacement never uses the previous local scene asset')
})

test('search is shared, expires after 30 seconds, refreshes on revision change, and failures retry', async () => {
  let now = 0, calls = 0, fail = false
  const cache = new PublicProductCache(async () => { calls++; if (fail) throw Error('offline'); return response([product('a')], '2') }, () => now)
  cache.advance('1')
  await Promise.all([cache.load(), cache.load()])
  assert.equal(calls, 1)
  await cache.load()
  assert.equal(calls, 1)
  now = 30_001
  fail = true
  await assert.rejects(cache.load(), /offline/)
  fail = false
  await cache.load()
  assert.equal(calls, 3)
  cache.advance('3')
  assert.equal(cache.getSnapshot().searchProducts, null)
  await cache.load() // old server response is discarded, never relabelled as 3
  assert.equal(cache.getSnapshot().searchProducts, null)
})

test('deleted or deactivated products are tombstoned; stale page payloads cannot resurrect them', async () => {
  const cache = new PublicProductCache(async () => response([], '5'))
  cache.seed([product('a')], '4')
  cache.advance('5')
  await cache.load(['a'])
  cache.seed([product('a')], '5')
  assert.deepEqual(cache.resolve([product('a')], '4'), [])
  assert.deepEqual(cache.getSnapshot().products, [])
})
