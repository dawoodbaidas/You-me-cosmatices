import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { catalogueFingerprint, migrateOne, prepareImage, storagePath, loadSource, sha256, verifyStorageObject } from '../scripts/lib/product-image-migration.mjs'
import { managedImagePath } from '../src/lib/products/images.ts'

const base = 'https://example.supabase.co'
const input = await sharp({ create: { width: 1800, height: 900, channels: 3, background: '#b23377' } }).png().toBuffer()
const product = { id: randomUUID(), name_ar: 'اختبار', slug: 'test', image_url: '/products/test.png', updated_at: '2026-10-05T00:00:00Z', price: 10, is_active: true }
const source = { bytes: input, kind: 'local', source: '/public/products/test.png' }

function harness(options = {}) {
  const events = []
  const objects = new Map()
  if (options.existing) objects.set(storagePath(product.id, options.existing), options.existing)
  let row = { ...product }
  const client = {
    storage: { from: () => ({
      getPublicUrl: key => ({ data: { publicUrl: `${base}/storage/v1/object/public/product-images/${key}` } }),
      download: async key => {
        events.push('download')
        if (options.downloadFails) return { error: { statusCode: '403', message: 'forbidden' } }
        const bytes = objects.get(key)
        if (!bytes) return { error: { code: 'NoSuchKey', statusCode: '404', message: 'missing' } }
        return { data: new Blob([options.empty ? Buffer.alloc(0) : options.corrupt ? Buffer.from('bad bytes') : bytes], { type: options.wrongMime ? 'image/png' : options.noMime ? '' : 'image/webp' }), error: null }
      },
      upload: async (key, bytes, settings) => {
        events.push('upload')
        assert.equal(settings.upsert, false)
        assert.equal(settings.contentType, 'image/webp')
        if (options.uploadFails) return { error: { message: 'upload failed' } }
        objects.set(key, bytes)
        return { error: null }
      },
    }) },
    from: () => {
      let patch
      const filters = []
      const query = {
        update(value) { patch = value; assert.deepEqual(Object.keys(value), ['image_url']); return query },
        eq(key, value) { filters.push([key, value]); return query }, is() { return query }, select() { return query },
        async single() {
          if (patch) {
            events.push('update')
            assert.deepEqual(filters, [['id', product.id], ['updated_at', product.updated_at], ['image_url', product.image_url]])
            if (options.dbFails) return { error: { message: 'stale version' }, data: null }
            row = { ...row, ...patch }
          }
          return { data: row, error: null }
        },
      }
      return query
    },
  }
  return { client, events, row: () => row }
}

test('dry run decodes and plans without any storage or database mutations', async () => {
  const h = harness()
  const report = await migrateOne(product, { source, client: h.client, supabaseUrl: base, dryRun: true })
  assert.deepEqual(h.events, ['download'])
  assert.equal(report.conversionRequired, true)
  assert.equal(report.updated, false)
  assert.equal(managedImagePath(report.intendedImageUrl, product.id, base), report.intendedStoragePath)
})

test('migration verifies authenticated Storage bytes before updating, without public GET', async t => {
  const h = harness()
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Public HTTP must not be called') })
  const report = await migrateOne(product, { source, client: h.client, supabaseUrl: base })
  assert.deepEqual(h.events, ['download', 'upload', 'download', 'update'])
  assert.equal(report.verified, true)
  assert.equal(report.updated, true)
  assert.equal(h.row().price, product.price)
  assert.equal(h.row().id, product.id)
})

test('failed upload/download, empty/corrupt bytes and wrong MIME preserve original URL', async () => {
  for (const options of [{ uploadFails: true }, { corrupt: true }, { wrongMime: true }, { empty: true }, { downloadFails: true }]) {
    const h = harness(options)
    await assert.rejects(migrateOne(product, { source, client: h.client, supabaseUrl: base }))
    assert.equal(h.row().image_url, product.image_url)
    assert(!h.events.includes('update'))
  }
})

test('stale database update retains originals and reports uploaded orphan safely', async () => {
  const h = harness({ dbFails: true })
  await assert.rejects(migrateOne(product, { source, client: h.client, supabaseUrl: base }), error => error.report.uploaded && !error.report.updated)
  assert.equal(h.row().image_url, product.image_url)
})

test('optimized WebP bytes are reused and managed images are skipped', async () => {
  const first = await prepareImage(input)
  const second = await prepareImage(first.output)
  assert.equal(second.converted, false)
  assert.deepEqual(first.output, second.output)
  assert.equal(storagePath(product.id, first.output), storagePath(product.id, second.output))
  const h = harness({ existing: first.output })
  const current = `${base}/storage/v1/object/public/product-images/${storagePath(product.id, first.output)}`
  const result = await migrateOne({ ...product, image_url: current }, { source: { ...source, bytes: first.output }, client: h.client, supabaseUrl: base, dryRun: true })
  assert.equal(result.skipped, true)
  assert.equal(result.intendedImageUrl, current)
  assert.deepEqual(h.events, ['download'])
})

test('failed-run report resumes verified existing object without source, conversion or upload', async t => {
  const { output } = await prepareImage(input)
  const h = harness({ existing: output })
  const objectPath = storagePath(product.id, output)
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Public propagation error must not block resume') })
  const resume = { id: product.id, currentImageUrl: product.image_url, intendedStoragePath: objectPath,
    intendedImageUrl: `${base}/storage/v1/object/public/product-images/${objectPath}`, sha256: sha256(output) }
  // No root/source provided: touching the original would fail this test.
  const report = await migrateOne(product, { client: h.client, supabaseUrl: base, resume })
  assert.deepEqual(h.events, ['download', 'update'])
  assert.equal(report.alreadyUploaded, true)
  assert.equal(report.verified, true)
  assert.equal(report.converted, false)
  assert.equal(report.uploaded, false)
  assert.equal(report.updated, true)
})

test('existing deterministic object is reused even without a previous report', async () => {
  const { output } = await prepareImage(input)
  const h = harness({ existing: output })
  const result = await migrateOne(product, { source: { ...source, bytes: output }, client: h.client, supabaseUrl: base })
  assert.deepEqual(h.events, ['download', 'update'])
  assert.equal(result.alreadyUploaded, true)
  assert.equal(result.uploaded, false)
})

test('Storage verification permits absent MIME but rejects hash mismatch', async () => {
  const { output } = await prepareImage(input)
  const h = harness({ existing: output, noMime: true })
  const objectPath = storagePath(product.id, output)
  assert.equal((await verifyStorageObject(h.client, objectPath, sha256(output))).meta.format, 'webp')
  await assert.rejects(verifyStorageObject(h.client, objectPath, '0'.repeat(64)), /hash differs/)
})

test('catalogue fingerprint permits only image URL and automatic product timestamp changes', () => {
  const before = catalogueFingerprint([product], [{ id: 'v', price: 1 }])
  assert.equal(catalogueFingerprint([{ ...product, image_url: 'new.webp', updated_at: 'later' }], [{ id: 'v', price: 1 }]), before)
  assert.notEqual(catalogueFingerprint([{ ...product, price: 11 }], [{ id: 'v', price: 1 }]), before)
  assert.notEqual(catalogueFingerprint([product], [{ id: 'v', price: 2 }]), before)
})

test('missing and unapproved sources fail without guessing catalogue mappings', async () => {
  await assert.rejects(loadSource(null, {}), /MISSING/)
  await assert.rejects(loadSource('https://untrusted.example/image.jpg', { supabaseUrl: base, storefrontUrl: 'https://shop.example' }), /Unapproved/)
})
