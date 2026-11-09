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

test('upload commits original and display references atomically without deleting prior images', async () => {
  const input = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#fff' } }).png().toBuffer()
  const uploads = [], previews = [], commits = []
  const storage = { upload: async (path, bytes) => { uploads.push({ path, bytes }); return {} }, getPublicUrl: path => ({ data: { publicUrl: 'https://store.test/' + path } }), remove() { throw Error('Prior media must be retained') } }
  const client = { storage: { from: () => storage }, from: table => ({ insert: async row => { assert.equal(table, 'product_image_previews'); previews.push(row); return {} } }), rpc: async (name, args) => { commits.push({ name, args }); return {} } }
  const form = new FormData()
  form.set('product', JSON.stringify({ id: '12345678-1234-1234-1234-123456789012', variants: [], updatedAt: null }))
  form.set('image', new Blob([input], { type: 'image/png' }), 'original.png')
  form.set('image_confirmed', 'true')
  const load = modules({ '@/lib/admin-request': { authorizeAdminRequest: async () => null, boundedFormData: async () => form }, '@/lib/products/editor': { MAX_UPLOAD_BYTES: 4 * 1024 * 1024, UUID: /^[a-f0-9-]{36}$/, validateProduct() {} }, '@/lib/supabase/server': { createClient: async () => client }, '@/lib/store-cache': { invalidateStoreCatalogue() {} } })
  const response = await load('@/app/api/admin/products/route').POST(new Request('http://store.test', { method: 'POST' }))
  assert.equal(response.status, 200)
  assert.equal(uploads.length, 2)
  assert.deepEqual(uploads[1].bytes, input)
  assert.equal(previews[0].original_url, 'https://store.test/' + uploads[1].path)
  assert.equal(previews[0].processed_url, 'https://store.test/' + uploads[0].path)
  assert.equal(commits[0].args.p_product.image_preview_id, previews[0].id)
})
