// Opt-in real remove.bg + Supabase Storage smoke test. No product or section
// records are changed. Only this run's unique, unattached Storage objects are removed.
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import env from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { modules } from './helpers/load-app.mjs'

if (!process.argv.includes('--run')) throw new Error('Use --run to call the configured remove.bg and Supabase services')
env.loadEnvConfig(process.cwd())
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
assert.ok(url && key && process.env.REMOVE_BG_API_KEY, 'Service configuration is required')
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const load = modules({}, process.env)
const { sourceProductImage } = load('@/lib/products/source-image')
const { removeProductBackground } = load('@/lib/products/remove-background')
const { approvedProductImage, verifyProductImage, IMAGE_BUCKET } = load('@/lib/products/images')
const { data, error } = await client.from('products').select('original_image_url,image_url').not('original_image_url', 'is', null).limit(1).single()
assert.ifError(error)
const input = await sourceProductImage(data.original_image_url ?? data.image_url)
const output = await removeProductBackground(input, process.env.REMOVE_BG_API_KEY, new AbortController().signal)
assert.equal((await verifyProductImage(output)).transparent, true)
// An ordinary transparent upload follows the same conversion path without the
// image_processed flag and must still produce a verified transparent image.
const ordinary = await approvedProductImage(output, false)
assert.equal((await verifyProductImage(ordinary)).transparent, true)
const bucket = client.storage.from(IMAGE_BUCKET), id = randomUUID(), uploaded = []
try {
  for (const [label, bytes] of [['approved', output], ['ordinary-transparent', ordinary]]) {
    const path = `products/${id}/${randomUUID()}.webp`
    const stored = await bucket.upload(path, bytes, { contentType: 'image/webp', cacheControl: '31536000', upsert: false })
    assert.ifError(stored.error); uploaded.push(path)
    const downloaded = await bucket.download(path)
    assert.ifError(downloaded.error)
    const roundtrip = Buffer.from(await downloaded.data.arrayBuffer())
    assert.equal(createHash('sha256').update(roundtrip).digest('hex'), createHash('sha256').update(bytes).digest('hex'))
    assert.equal((await verifyProductImage(roundtrip)).transparent, true)
    console.log(`PASS: ${label}: real Storage upload/download preserves exact transparent bytes`)
  }
  console.log('PASS: real remove.bg processing. Product/section commits require migration 008 and an authenticated admin session; this smoke test does not claim those checks.')
} finally {
  if (uploaded.length) {
    const cleanup = await bucket.remove(uploaded)
    assert.ifError(cleanup.error)
    console.log(`Removed ${uploaded.length} temporary test objects; existing media and product data unchanged`)
  }
}
