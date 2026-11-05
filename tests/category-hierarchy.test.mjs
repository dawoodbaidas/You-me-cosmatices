import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { storeDatabase } from './helpers/store-database.mjs'
import { modules } from './helpers/load-app.mjs'

test('category hierarchy preserves identities, old paths, memberships, validates cycles and deletes atomically', async () => {
 const db=await storeDatabase()
 try {
  await db.exec("insert into store_categories(slug,name_ar) values('men','رجالي'),('other','رجالي')")
  await db.exec("insert into store_categories(slug,name_ar,parent_slug) values('bags','حقائب رجالية','men'),('nested','جلد','bags')")
  assert.equal((await db.query("select url_slug from store_categories where slug='other'")).rows[0].url_slug,'رجالي-2')
  const paths=()=>db.query('select path,category_id from category_paths')
  assert.ok((await paths()).rows.some(r=>r.path==='رجالي/حقائب-رجالية/جلد'))
  const original=(await db.query("select * from store_categories where slug='nested'")).rows[0]
  await db.exec("insert into products(slug,name_ar,name_en,category,category_label,price) values('test','اختبار','test','care','عناية',3)")
  const product=(await db.query("select id from products where slug='test'")).rows[0]
  await db.query("insert into product_categories values($1,'nested'),($1,'bags')",[product.id])
  await db.exec("update store_categories set name_ar='حقائب جديدة' where slug='bags'")
  assert.ok((await paths()).rows.some(r=>r.path==='رجالي/حقائب-رجالية/جلد'&&r.category_id===original.id))
  assert.ok((await paths()).rows.some(r=>r.path==='رجالي/حقائب-جديدة/جلد'&&r.category_id===original.id))
  await db.exec("update store_categories set parent_slug='other' where slug='bags'")
  await assert.rejects(db.exec("update store_categories set parent_slug='nested' where slug='other'"))
  await assert.rejects(db.exec("update store_categories set slug='changed' where slug='nested'"))
  const current=(await db.query("select * from store_categories where slug='bags'")).rows[0]
  await assert.rejects(db.query('select admin_delete_category($1,$2,$3)',['bags',current.updated_at,'nested']))
  assert.equal((await db.query('select count(*) from product_categories')).rows[0].count,2)
  await db.query('select admin_delete_category($1,$2,$3)',['bags',current.updated_at,'men'])
  assert.equal((await db.query('select count(*) from products')).rows[0].count,1)
  assert.deepEqual((await db.query('select category_slug from product_categories order by category_slug')).rows.map(r=>r.category_slug),['men','nested'])
  assert.equal((await db.query("select parent_slug from store_categories where slug='nested'")).rows[0].parent_slug,'men')
  const load=modules(), {storeCollections,categoryPath}=load('@/lib/store-categories')
  const categories=(await db.query('select * from store_categories')).rows
  const groups=storeCollections(categories,[{id:product.id,categorySlugs:['nested']}])
  assert.equal(groups.find(g=>g.id==='men').directProductIds.length,0)
  assert.equal(groups.find(g=>g.id==='men').children[0].directProductIds.length,1)
  assert.equal(categoryPath(categories.find(c=>c.slug==='nested'),categories),'/categories/'+encodeURIComponent('رجالي')+'/'+encodeURIComponent('جلد'))
  await db.exec('set role anon')
  await assert.rejects(db.exec("update store_categories set name_ar='forbidden'"))
  await assert.rejects(db.query('select admin_delete_category($1,$2,$3)',['men',current.updated_at,null]))
  assert.ok((await db.query('select * from category_paths')).rows.length)
 } finally {await db.close()}
})

test('background preview approval and original restoration are atomic and survive reload without changing product identity',async()=>{
 const db=await storeDatabase()
 try {
  const id=randomUUID(), previewId=randomUUID()
  const product={id,slug:'image-test',name_ar:'منتج',name_en:'Product',category:'care',category_label:'عناية',price:3,old_price:null,benefits:[],is_active:true,is_featured:false,sort_order:0,image_url:'https://example.test/original.webp'}
  const save=async(p,version)=>db.query('select admin_save_product($1::jsonb,$2::jsonb,$3)',[JSON.stringify(p),'[]',version])
  await save(product,null)
  const before=(await db.query('select * from products where id=$1',[id])).rows[0]
  await db.query('insert into product_image_previews(id,product_id,expected_updated_at,original_url,processed_url) values($1,$2,$3,$4,$5)',[previewId,id,before.updated_at,product.image_url,'https://example.test/processed.webp'])
  assert.equal((await db.query('select image_url from products where id=$1',[id])).rows[0].image_url,product.image_url)
  await assert.rejects(save({...product,image_preview_id:previewId},'2000-01-01'))
  await save({...product,image_preview_id:previewId},before.updated_at)
  const approved=(await db.query('select * from products where id=$1',[id])).rows[0]
  assert.equal(approved.image_url,'https://example.test/processed.webp')
  assert.equal(approved.original_image_url,product.image_url)
  assert.equal((await db.query('select count(*) from product_image_previews')).rows[0].count,0)
  const {image_url,...draft}=product
  await save({...draft,restore_image:true},approved.updated_at)
  const restored=(await db.query('select * from products where id=$1',[id])).rows[0]
  assert.equal(restored.image_url,image_url)
  assert.equal(restored.processed_image_url,approved.processed_image_url)
 }finally{await db.close()}
})
