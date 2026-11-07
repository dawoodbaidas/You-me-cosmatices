import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync('src/lib/public-products.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function cache(fetch) {
  const exports = {}
  new Function('exports', 'fetch', compiled)(exports, fetch)
  return exports.createPublicProducts()
}
const product = (id, price = 5) => ({ id, price })
const response = (products, revision = '1') => Response.json(products, { headers: { 'X-Store-Revision': revision } })

test('known cart IDs and complete search are reused without requests', async () => {
  let requests = 0
  const store = cache(async () => { requests++; return response([product('a'), product('b')]) })
  store.seed([product('a')], '1')
  await store.load(['a'])
  assert.equal(requests, 0)
  await Promise.all([store.load(), store.load()])
  await store.load()
  await store.load(['deleted'])
  assert.equal(requests, 1)
  assert.equal(store.getSnapshot().complete, true)
})

test('partial loads request only missing IDs and remember deleted IDs', async () => {
  const urls = []
  const store = cache(async url => { urls.push(url); return response([product('b')]) })
  store.seed([product('a')], '1')
  await store.load(['a', 'b', 'deleted', 'b'])
  await store.load(['deleted', 'b'])
  assert.equal(urls.length, 1)
  assert.equal(new URL(urls[0], 'https://test.invalid').searchParams.get('ids'), 'b,deleted')
  assert.deepEqual(store.missing(['a', 'b', 'deleted']), [])
})

test('new revision discards search and cart records; older page/async results cannot overwrite it', async () => {
  let finish
  const store = cache(() => new Promise(resolve => { finish = resolve }))
  store.seed([product('a')], '9007199254740993')
  const pending = store.load()
  store.seed([product('a', 9)], '9007199254740994')
  finish(response([product('a', 1)], '9007199254740993'))
  await pending
  store.seed([product('a', 2)], '9007199254740992', true)
  assert.equal(store.getSnapshot().products[0].price, 9)
  assert.equal(store.getSnapshot().complete, false)
  assert.deepEqual(store.missing(['b']), ['b'])
})

test('failed requests are retryable and cannot masquerade as an empty catalogue', async () => {
  let requests = 0
  const store = cache(async () => ++requests === 1 ? new Response('', { status: 503 }) : response([]))
  await assert.rejects(store.load(['a']))
  assert.deepEqual(store.missing(['a']), ['a'])
  await store.load(['a'])
  assert.equal(requests, 2)
  assert.deepEqual(store.missing(['a']), [])
})

test('large persisted carts are split into API-sized requests', async () => {
  const sizes = []
  const store = cache(async url => { sizes.push(new URL(url, 'https://test.invalid').searchParams.get('ids').split(',').length); return response([]) })
  store.seed([], '1')
  await store.load(Array.from({ length: 205 }, (_, i) => String(i)))
  assert.deepEqual(sizes, [100, 100, 5])
})
