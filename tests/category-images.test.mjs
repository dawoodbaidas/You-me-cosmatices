import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { modules } from './helpers/load-app.mjs'
import { storeDatabase } from './helpers/store-database.mjs'

test('category image upload commits root/child images, replaces URLs, preserves previous image on failure and rejects non-admins', async () => {
  const db = await storeDatabase()
  try {
    await db.exec("insert into store_categories(slug,name_ar) values('root','رئيسي'); insert into store_categories(slug,name_ar,parent_slug) values('child','فرعي','root')")
    const files = new Map()
    let authorized = true, failUpload = false, failSave = false, invalidations = 0
    const client = {
      storage: { from(bucket) {
        assert.equal(bucket, 'category-images')
        return {
          async upload(path, bytes, options) {
            if (failUpload) return { error: { message: 'denied' } }
            assert.equal(options.cacheControl, '31536000')
            assert.equal((await sharp(bytes).metadata()).format, 'webp')
            assert.ok(!files.has(path), 'replacement must use a new cache key')
            files.set(path, bytes); return { error: null }
          },
          async remove(paths) { paths.forEach(path => files.delete(path)); return { error: null } },
        }
      } },
      async rpc(name, args) {
        assert.equal(name, 'admin_save_category')
        if (failSave) return { error: { code: '40001', message: 'stale' } }
        try {
          await db.query('select admin_save_category($1::jsonb,$2)', [JSON.stringify(args.p_category), args.p_expected_updated_at])
          return { error: null }
        } catch (error) { return { error } }
      },
    }
    const load = modules({
      '@/lib/auth': { getViewer: async () => ({ user: authorized ? { id: 'admin' } : null, admin: authorized }) },
      '@/lib/supabase/server': { createClient: async () => client },
      '@/lib/store-cache': { invalidateStoreCatalogue() { invalidations++ } },
    })
    const { POST } = load('@/app/api/admin/categories/route')
    const bytes = await sharp({ create: { width: 20, height: 15, channels: 3, background: '#ae4862' } }).png().toBuffer()
    const read = async slug => (await db.query('select * from store_categories where slug=$1', [slug])).rows[0]
    const save = async slug => {
      const row = await read(slug)
      const form = new FormData()
      form.set('category', JSON.stringify(row))
      form.set('image', new File([bytes], 'photo.png', { type: 'image/png' }))
      return POST(new Request('https://store.test/api/admin/categories', { method: 'POST', body: form, headers: { origin: 'https://store.test', host: 'store.test' } }))
    }
    for (const slug of ['root', 'child']) {
      assert.equal((await read(slug)).image_path, null)
      assert.equal((await save(slug)).status, 200)
      const first = (await read(slug)).image_path
      assert.ok(files.has(first))
      assert.equal((await save(slug)).status, 200)
      const second = (await read(slug)).image_path
      assert.notEqual(first, second)
      assert.ok(files.has(first), 'old cached documents may still use the previous image')
      failUpload = true
      assert.equal((await save(slug)).status, 400)
      assert.equal((await read(slug)).image_path, second)
      failUpload = false; failSave = true
      const count = files.size
      assert.equal((await save(slug)).status, 400)
      assert.equal(files.size, count)
      assert.equal((await read(slug)).image_path, second)
      failSave = false
    }
    assert.equal(invalidations, 4)
    const empty = new FormData()
    empty.set('category', JSON.stringify(await read('root')))
    empty.set('image', new File([], 'empty.png', { type: 'image/png' }))
    const rejected = await POST(new Request('https://store.test/api/admin/categories', { method: 'POST', body: empty, headers: { origin: 'https://store.test', host: 'store.test' } }))
    assert.equal(rejected.status, 400, 'an empty upload must never report successful image save')
    assert.equal(invalidations, 4)
    authorized = false
    assert.equal((await save('root')).status, 403)
    assert.equal(invalidations, 4)
    await db.exec('set role anon')
    const catalogue = (await db.query('select get_store_catalogue(null) data')).rows[0].data
    assert.ok(catalogue.categories.every(row => files.has(row.image_path)))
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('category-images',$1)", [catalogue.categories[0].image_path]))
    await db.exec("set role authenticated; select set_config('test.jwt','{}',false)")
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('category-images',$1)", [catalogue.categories[0].image_path]))
  } finally { await db.close() }
})
