import test from 'node:test'
import assert from 'node:assert/strict'
import { storeDatabase } from './helpers/store-database.mjs'
import { modules } from './helpers/load-app.mjs'

test('both home sections save ordered products and reject stale revisions', async () => {
  const db = await storeDatabase()
  try {
    await db.exec("insert into products(slug,name_ar,name_en,category,category_label,price) values('probe','probe','probe','care','care',5),('probe-two','probe','probe','care','care',6)")
    const ids = (await db.query('select id from products order by slug')).rows.map(row => row.id)
    for (const section of ['hero', 'bestsellers']) {
      const revision = async () => (await db.query('select updated_at::text from home_sections where section=$1', [section])).rows[0].updated_at
      const before = await revision()
      const storeVersion = async () => (await db.query('select version from store_revision')).rows[0].version
      const previousVersion = await storeVersion()
      await db.query('select admin_save_home_section($1,$2,$3)', [section, ids, before])
      assert.ok(await storeVersion() > previousVersion)
      const saved = await revision()
      assert.notEqual(saved, before)
      assert.deepEqual((await db.query('select product_id from home_section_products where section=$1 order by position', [section])).rows.map(row => row.product_id), ids)
      await assert.rejects(db.query('select admin_save_home_section($1,$2,$3)', [section, [], before]), { code: '40001' })
      await db.query('select admin_save_home_section($1,$2,$3)', [section, [...ids].reverse(), saved])
      const catalogue = (await db.query('select get_store_catalogue(null) data')).rows[0].data
      assert.deepEqual(catalogue.home_sections[section], [...ids].reverse())
      await db.query('select admin_save_home_section($1,$2,$3)', [section, [], await revision()])
    }
  } finally { await db.close() }
})

test('home save preserves precise tokens and invalidates editor and storefront only after commit', async () => {
  const paths = [], calls = []
  let error = null, invalidations = 0
  const { saveHomeSection } = modules({
    'next/cache': { revalidatePath: path => paths.push(path) },
    '@/lib/auth': { isAdmin: async () => true },
    '@/lib/supabase/server': { createClient: async () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { error } } }) },
    '@/lib/store-cache': { invalidateStoreCatalogue: () => invalidations++ },
  })('@/app/admin/actions')
  const token = '2026-11-12T10:00:00.123456+00:00'
  for (const section of ['hero', 'bestsellers']) {
    const result = await saveHomeSection(section, [], token)
    assert.equal(result.ok, true)
    assert.deepEqual(calls.at(-1), { name: 'admin_save_home_section', args: { p_section: section, p_ids: [], p_expected_updated_at: token } })
  }
  assert.deepEqual(paths, ['/admin/storefront', '/admin/storefront'])
  assert.equal(invalidations, 2)
  error = { code: '40001', message: 'Section changed; reload' }
  assert.match((await saveHomeSection('hero', [], token)).message, /جلسة أخرى/)
  error = { code: '42501', message: 'permission denied' }
  assert.doesNotMatch((await saveHomeSection('bestsellers', [], token)).message, /جلسة أخرى/)
  assert.equal(invalidations, 2)
  assert.equal(paths.length, 2)
})


test('home image validation accepts opaque and legacy images without fetching or changing products', async () => {
  const { verifySceneSelection } = modules()('@/lib/products/verification')
  let rows = [{ id: 'one', name_ar: 'Product', image_url: '/products/original.jpg' }]
  const client = { from(table) {
    assert.equal(table, 'products')
    return { select: () => ({ in: async () => ({ data: rows, error: null }) }) }
  } }
  await verifySceneSelection(client, ['one'])
  rows = [{ ...rows[0], image_url: '   ' }]
  await assert.rejects(verifySceneSelection(client, ['one']))
  rows = []
  await assert.rejects(verifySceneSelection(client, ['one']))
})
