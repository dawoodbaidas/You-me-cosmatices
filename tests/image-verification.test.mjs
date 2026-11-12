import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { modules } from './helpers/load-app.mjs'
import { storeDatabase } from './helpers/store-database.mjs'

const { approvedProductImage, verifyProductImage } = modules()('@/lib/products/images')
const cutout = () => sharp({ create: { width: 80, height: 100, channels: 4, background: '#0000' } })
  .composite([{ input: Buffer.from('<svg width="80" height="100"><rect x="20" y="10" width="40" height="80" fill="red"/></svg>') }]).png().toBuffer()

test('ordinary PNG/WebP uploads are verified from pixels, while opaque and empty images remain ineligible', async () => {
  const png = await cutout()
  for (const source of [png, await sharp(png).webp().toBuffer()]) {
    const display = await approvedProductImage(source, false)
    assert.equal((await verifyProductImage(display)).transparent, true)
  }
  for (const background of ['#ffff', '#0000']) {
    const bytes = await sharp({ create: { width: 32, height: 32, channels: 4, background } }).png().toBuffer()
    assert.equal((await verifyProductImage(bytes)).transparent, false)
    await assert.rejects(approvedProductImage(bytes, true))
  }
})

test('real SQL commits active image and metadata together, survives rereads, and enforces scene/concurrency rules', async () => {
  const db = await storeDatabase()
  try {
    await db.exec('reset role; create role service_role bypassrls;')
    for (const file of ['007_product_availability.sql', '008_product_image_verification.sql', '009_any_product_image.sql', '009_any_product_image.sql']) {
      await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
    }
    await db.exec('set role authenticated')
    const id = randomUUID(), previewId = randomUUID()
    const original = 'https://store.test/storage/v1/object/public/product-images/products/' + id + '/' + randomUUID() + '.png'
    const active = 'https://store.test/storage/v1/object/public/product-images/products/' + id + '/' + randomUUID() + '.webp'
    const bytes = await approvedProductImage(await cutout(), false)
    const receipt = await verifyProductImage(bytes)
    await assert.rejects(db.query('insert into product_image_verifications values($1,$2,$3)', [id, active, receipt]), { code: '42501' })
    await db.exec('reset role')
    await db.query('insert into product_image_verifications values($1,$2,$3)', [id, active, receipt])
    await db.exec('set role authenticated')
    await db.query('insert into product_image_previews(id,product_id,original_url,processed_url) values($1,$2,$3,$4)', [previewId,id,original,active])
    const product = { id, slug: 'image-workflow', name_ar: 'صورة', name_en: 'Image', category: 'care', category_label: 'Care', benefits: [], price: 5, original_price: 5, old_price: null, discount_enabled: false, is_active: true, is_featured: false, sort_order: 0, image_preview_id: previewId }
    const saved = (await db.query('select admin_save_product($1,$2,null) data', [product, []])).rows[0].data
    const read = async () => (await db.query('select *,updated_at::text as token from products where id=$1', [id])).rows[0]
    let row = await read()
    assert.equal(row.image_url, active)
    assert.equal(row.original_image_url, original)
    assert.equal(row.processed_image_url, active)
    assert.deepEqual(row.image_verifications[active], receipt)
    assert.equal(Date.parse(row.token), Date.parse(saved.updated_at))
    const sectionToken = async section => (await db.query('select updated_at::text token from home_sections where section=$1', [section])).rows[0].token
    for (const section of ['hero', 'bestsellers']) {
      const token = await sectionToken(section)
      await db.query('select admin_save_home_section($1,$2,$3)', [section,[id],token])
      await assert.rejects(db.query('select admin_save_home_section($1,$2,$3)', [section,[],token]), { code: '40001' })
      assert.deepEqual((await db.query('select get_store_catalogue(null) data')).rows[0].data.home_sections[section], [id])
    }
    // A new processed result must replace an already-selected image atomically.
    const second = active.replace('.webp', '-second.webp')
    const nextPreview = randomUUID(), stale = row.token
    await db.exec('reset role')
    await db.query('insert into product_image_verifications values($1,$2,$3)', [id,second,receipt])
    await db.exec('set role authenticated')
    await db.query('insert into product_image_previews(id,product_id,expected_updated_at,original_url,processed_url) values($1,$2,$3,$4,$5)', [nextPreview,id,stale,original,second])
    await db.query('select admin_save_product($1,$2,$3)', [{...product,image_preview_id:nextPreview},[],stale])
    row = await read()
    assert.equal(row.image_url, second)
    assert.equal(row.image_verifications[second].transparent, true)
    const plainProduct = {...product}; delete plainProduct.image_preview_id
    await assert.rejects(db.query('select admin_save_product($1,$2,$3)', [plainProduct,[],stale]), {code:'40001'})
    // Restore opaque originals while retaining both home selections.
    await db.query('select admin_save_product($1,$2,$3)', [{...plainProduct,restore_image:true},[],row.token])
    assert.equal((await read()).image_url, original)
    await db.query('select admin_save_home_section($1,$2,$3)', ['hero',[id],await sectionToken('hero')])
    for (const section of ['hero','bestsellers']) assert.deepEqual((await db.query('select get_store_catalogue(null) data')).rows[0].data.home_sections[section], [id])
    await assert.rejects(db.query('update products set image_url=null where id=$1', [id]), {code:'23514'})
    await assert.rejects(db.query('select admin_save_home_section($1,$2,$3)', ['hero',[id,id],await sectionToken('hero')]), {code:'22023'})
    await db.query("update products set image_verifications=jsonb_build_object(image_url,$2::jsonb) where id=$1", [id,receipt])
    assert.equal((await read()).image_verifications[original], undefined, 'client flags cannot forge verification')
    assert.equal((await db.query('select verified_scene_image(p) image from products p where id=$1',[id])).rows[0].image, original)
    await db.exec("select set_config('test.jwt','{}',false)")
    await assert.rejects(db.query('select admin_save_home_section($1,$2,$3)', ['hero',[],await sectionToken('hero')]), {code:'42501'})
  } finally { await db.close() }
})
