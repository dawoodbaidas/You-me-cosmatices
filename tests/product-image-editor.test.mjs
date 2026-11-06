import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { modules } from './helpers/load-app.mjs'

const id = randomUUID(), version = '2026-11-06T00:00:00.000Z'
const input = await sharp({ create: { width: 60, height: 40, channels: 3, background: '#b27280' } }).png().toBuffer()
const rgba = Buffer.alloc(24 * 16 * 4)
for (let y = 3; y < 13; y++) for (let x = 4; x < 20; x++) rgba.set([31, 99, 171, 255], (y * 24 + x) * 4)
const cutout = await sharp(rgba, { raw: { width: 24, height: 16, channels: 4 } }).png().toBuffer()

function api({ key = 'test-server-only-secret', allowed = true, stale = false } = {}) {
  return modules({
    '@/lib/auth': { getViewer: async () => ({ user: allowed ? {} : null, admin: allowed }) },
    '@/lib/supabase/server': { createClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: stale ? null : { image_url: '/products/source.png', original_image_url: null }, error: stale ? {} : null }) }) }) }) }), storage: { from: () => { throw new Error('Preview must never write Storage') } } }) },
    '@/lib/products/source-image': { sourceProductImage: async () => input },
  }, { REMOVE_BG_API_KEY: key })('@/app/api/admin/products/remove-background/route')
}
function request({ file = input, existing = false, origin = 'https://store.test' } = {}) {
  const body = new FormData(); body.set('productId', id); body.set('updatedAt', existing ? version : '')
  if (file) body.set('image', new File([file], 'source.png', { type: 'image/png' }))
  return new Request('https://store.test/api/admin/products/remove-background', { method: 'POST', body, headers: { origin, host: 'store.test' } })
}

test('remove.bg preview uses the exact endpoint, server key and multipart preview size, returning verified alpha without upscaling or Storage', async () => {
  const previous = globalThis.fetch
  let calls = 0
  try {
    globalThis.fetch = async (url, options) => {
      calls++; assert.equal(url, 'https://api.remove.bg/v1.0/removebg')
      assert.equal(options.headers['X-Api-Key'], 'test-server-only-secret')
      assert.equal(options.body.get('size'), 'preview'); assert.equal(options.body.get('format'), 'png'); assert.equal(options.body.get('channels'), 'rgba')
      assert.deepEqual(Buffer.from(await options.body.get('image_file').arrayBuffer()), input)
      assert.equal(options.redirect, 'error'); assert.ok(options.signal)
      return new Response(cutout, { headers: { 'Content-Type': 'image/png' } })
    }
    const response = await api().POST(request())
    assert.equal(response.status, 200); assert.equal(calls, 1)
    assert.match(response.headers.get('cache-control'), /no-store/)
    assert.equal(response.headers.get('content-type'), 'image/webp')
    const result = Buffer.from(await response.arrayBuffer()), metadata = await sharp(result).metadata()
    assert.equal(metadata.width, 24); assert.equal(metadata.height, 16); assert.equal(metadata.hasAlpha, true)
    assert.deepEqual(await sharp(result).ensureAlpha().raw().toBuffer(), rgba)
    assert.equal(JSON.stringify([...response.headers]).includes('test-server-only-secret'), false)
  } finally { globalThis.fetch = previous }
})

test('missing key, unauthorized and cross-origin requests, stale products and bad images never reach remove.bg', async () => {
  const previous = globalThis.fetch; let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('Should not call provider') }
  try {
    const missing = await api({ key: '' }).POST(request()); assert.equal(missing.status, 503); assert.match((await missing.json()).message, /REMOVE_BG_API_KEY/)
    assert.equal((await api({ allowed: false }).POST(request())).status, 403)
    assert.equal((await api().POST(request({ origin: 'https://evil.test' }))).status, 403)
    assert.equal((await api({ stale: true }).POST(request({ existing: true }))).status, 409)
    assert.equal((await api().POST(request({ file: Buffer.from('not an image') }))).status, 400)
    assert.equal((await api().POST(request({ file: Buffer.alloc(4 * 1024 * 1024 + 1) }))).status, 400)
    assert.equal(calls, 0)
  } finally { globalThis.fetch = previous }
})

test('invalid keys, quota/rate limits, invalid subjects, outages, timeouts and network failures are safe and never retried automatically', async () => {
  const previous = globalThis.fetch
  try {
    for (const [status, expected] of [[401, 503], [403, 503], [402, 429], [429, 429], [400, 400], [422, 400], [500, 502]]) {
      let calls = 0
      globalThis.fetch = async () => { calls++; return new Response('test-server-only-secret upstream error', { status }) }
      const response = await api().POST(request())
      assert.equal(response.status, expected); assert.equal(calls, 1)
      assert.equal(JSON.stringify(await response.json()).includes('test-server-only-secret'), false)
    }
    globalThis.fetch = async () => { throw new DOMException('secret timeout details', 'TimeoutError') }
    assert.equal((await api().POST(request())).status, 504)
    globalThis.fetch = async () => { throw new Error('secret network details') }
    const failed = await api().POST(request()); assert.equal(failed.status, 502); assert.equal((await failed.text()).includes('secret'), false)
  } finally { globalThis.fetch = previous }
})

test('opaque, completely erased, oversized and malformed API responses cannot be approved; existing originals stay supported', async () => {
  const previous = globalThis.fetch
  try {
    const empty = await sharp({ create: { width: 12, height: 12, channels: 4, background: '#00000000' } }).png().toBuffer()
    for (const bytes of [input, empty, Buffer.from('<html>invalid image</html>'), Buffer.alloc(12 * 1024 * 1024 + 1)]) {
      globalThis.fetch = async () => new Response(bytes)
      assert.equal((await api().POST(request())).status, 502)
    }
    globalThis.fetch = async () => new Response(cutout)
    assert.equal((await api().POST(request({ file: null, existing: true }))).status, 200)
  } finally { globalThis.fetch = previous }
})

test('Save uploads exactly the confirmed image as alpha WebP and retains product update concurrency behavior', async () => {
  const writes = [], saves = []
  const draft = { id, updatedAt: version, slug: 'image-test', name_ar: 'منتج', name_en: 'Product', description: null, category: 'care', category_label: 'عناية', price: 1, old_price: null, badge: null, benefits: [], is_active: true, is_featured: false, sort_order: 0, variants: [] }
  const route = modules({
    '@/lib/auth': { getViewer: async () => ({ user: {}, admin: true }) },
    '@/lib/store-cache': { invalidateStoreCatalogue() {} },
    '@/lib/supabase/server': { createClient: async () => ({
      storage: { from: () => ({ upload: async (path, bytes, options) => { writes.push({ path, bytes, options }); return { error: null } }, getPublicUrl: path => ({ data: { publicUrl: `https://qa.test/${path}` } }) }) },
      rpc: async (_, args) => { saves.push(args); return { data: { previous_image: null }, error: null } },
    }) },
  })('@/app/api/admin/products/route')
  function save(confirmed, processed, bytes) {
    const body = new FormData(); body.set('product', JSON.stringify(draft)); body.set('image', new File([bytes], 'image.png', { type: 'image/png' }))
    if (confirmed) body.set('image_confirmed', 'true')
    if (processed) body.set('image_processed', 'true')
    return route.POST(new Request('https://store.test/api/admin/products', { method: 'POST', body, headers: { origin: 'https://store.test', host: 'store.test' } }))
  }
  assert.equal((await save(false, true, cutout)).status, 400); assert.equal(writes.length, 0)
  assert.equal((await save(true, true, input)).status, 400); assert.equal(writes.length, 0)
  assert.equal((await save(true, true, cutout)).status, 200); assert.equal(writes.length, 1)
  assert.equal(writes[0].options.contentType, 'image/webp'); assert.match(writes[0].path, /\.webp$/)
  assert.deepEqual(await sharp(writes[0].bytes).ensureAlpha().raw().toBuffer(), rgba)
  assert.equal(saves[0].p_expected_updated_at, version); assert.equal('image_preview_id' in saves[0].p_product, false)
  assert.equal((await save(true, false, input)).status, 200); assert.equal(writes.length, 2)
  assert.equal((await sharp(writes[1].bytes).metadata()).format, 'webp')
})
