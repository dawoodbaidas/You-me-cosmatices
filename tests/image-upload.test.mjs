import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { modules } from './helpers/load-app.mjs'

test('new display WebP is bounded, preserves alpha and never changes original bytes', async () => {
  const { approvedProductImage, originalProductImage } = modules()('@/lib/products/images')
  const input = await sharp({ create: { width: 2400, height: 1800, channels: 4, background: '#f003' } }).png().toBuffer()
  const original = await originalProductImage(input)
  assert.deepEqual(original.bytes, input)
  const image = await approvedProductImage(input, true)
  const meta = await sharp(image).metadata()
  assert.equal(meta.format, 'webp')
  assert.equal(meta.width, 1600)
  assert.equal(meta.height, 1200)
  assert.equal(meta.hasAlpha, true)
  const small = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#fff' } }).png().toBuffer()
  assert.equal((await sharp(await approvedProductImage(small, false)).metadata()).width, 32)
  await assert.rejects(() => approvedProductImage(small, true))
})

for (const processed of [false, true]) test(`upload commits ${processed ? 'approved cutout' : 'unchanged original'} atomically without deleting prior images`, async () => {
  const input = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#fff' } }).png().toBuffer()
  const cutout = await sharp({ create: { width: 32, height: 24, channels: 4, background: '#f003' } }).webp().toBuffer()
  const uploads = [], previews = [], commits = []
  const storage = { upload: async (path, bytes) => { uploads.push({ path, bytes }); return {} }, getPublicUrl: path => ({ data: { publicUrl: 'https://store.test/' + path } }), remove() { throw Error('Prior media must be retained') } }
  const client = { storage: { from: () => storage }, from: table => ({ insert: async row => { assert.equal(table, 'product_image_previews'); previews.push(row); return {} } }), rpc: async (name, args) => { commits.push({ name, args }); return {} } }
  const form = new FormData()
  form.set('product', JSON.stringify({ id: '12345678-1234-1234-1234-123456789012', variants: [], updatedAt: null }))
  form.set('image', new Blob([input], { type: 'image/png' }), 'original.png')
  form.set('image_confirmed', 'true')
  if (processed) { form.set('image', new Blob([cutout]), 'processed.webp'); form.set('image_processed', 'true'); form.set('original_image', new Blob([input]), 'original.png') }
  const receipts = []
  const load = modules({ 'next/cache': { revalidatePath() {} }, '@/lib/products/verification': { recordImageVerification: async (id, source, bytes) => { receipts.push({ id, source, verification: await modules()('@/lib/products/images').verifyProductImage(bytes) }) } }, '@/lib/admin-request': { authorizeAdminRequest: async () => null, boundedFormData: async () => form }, '@/lib/products/editor': { MAX_UPLOAD_BYTES: 4 * 1024 * 1024, UUID: /^[a-f0-9-]{36}$/, validateProduct() {} }, '@/lib/supabase/server': { createClient: async () => client }, '@/lib/store-cache': { invalidateStoreCatalogue() {} } })
  const response = await load('@/app/api/admin/products/route').POST(new Request('http://store.test', { method: 'POST' }))
  assert.equal(response.status, 200)
  assert.equal(uploads.length, processed ? 2 : 1)
  assert.deepEqual(uploads[processed ? 1 : 0].bytes, input)
  assert.equal(previews[0].original_url, 'https://store.test/' + uploads[processed ? 1 : 0].path)
  assert.equal(previews[0].processed_url, 'https://store.test/' + uploads[0].path)
  assert.equal(commits[0].args.p_product.image_preview_id, previews[0].id)
  assert.equal(receipts.length, processed ? 2 : 1)
  assert.equal(receipts[0].verification.transparent, processed)
  assert.equal(receipts[0].source, previews[0].processed_url)
})
