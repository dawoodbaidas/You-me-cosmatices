import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { dirname, isAbsolute, resolve } from 'node:path'
import ts from 'typescript'
import { storeDatabase } from './helpers/store-database.mjs'

const require = createRequire(import.meta.url)
function modules(stubs = {}, environment = {}) {
  const loaded = new Map()
  const load = name => {
    if (name in stubs) return stubs[name]
    if (!name.startsWith('@/') && !name.startsWith('.') && !isAbsolute(name)) return require(name)
    const filename = name.startsWith('@/') ? `src/${name.slice(2)}.ts` : name
    if (loaded.has(filename)) return loaded.get(filename).exports
    const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const compiled = { exports: {} }
    loaded.set(filename, compiled)
    new Function('require', 'module', 'exports', 'process', source)(id => load(id.startsWith('.') ? resolve(dirname(filename),`${id}.ts`) : id), compiled, compiled.exports, { env: environment })
    return compiled.exports
  }
  return load
}

test('database-owned collections have no inferred products, preserve empty categories and database ordering', () => {
  const load = modules()
  const { storeCollections, findCollection, collectionHref } = load('@/lib/store-categories')
  const categories = [
    {slug:'empty',name_ar:'قسم فارغ',parent_slug:null,sort_order:2,is_active:true},
    {slug:'care',name_ar:'اسم من القاعدة',parent_slug:null,sort_order:0,is_active:true},
    {slug:'skin',name_ar:'فرعي',parent_slug:'care',sort_order:0,is_active:true},
    {slug:'hidden',name_ar:'مخفي',parent_slug:null,sort_order:0,is_active:false},
  ]
  const products = [{id:'db',categorySlugs:['skin']},{id:'unassigned',category:'skincare',categoryLabel:'العناية بالبشرة'}]
  const groups = storeCollections(categories, products)
  assert.deepEqual(groups.map(group => group.id), ['care','empty'])
  assert.deepEqual(findCollection(groups,'care').productIds, ['db'])
  assert.deepEqual(findCollection(groups,'empty').productIds, [])
  assert.equal(findCollection(groups,'hidden'), undefined)
  assert.equal(collectionHref('care'), '/category/care')
  assert.deepEqual(storeCollections([], products), [])
})

test('public catalogue uses only database rows and revisioned cache; admin writes expire it after commit', async () => {
  const db = await storeDatabase()
  const oldFetch = globalThis.fetch
  const environment = { NEXT_PUBLIC_SUPABASE_URL: 'https://database.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon' }
  const cached = new Map(), invalidated = [], paths = []
  let reads = 0, revisionReads = 0, authorized = true
  const result = async (query, params) => {
    try { return { data:(await db.query(query,params)).rows[0]?.result ?? null, error:null } }
    catch (error) { return { data:null,error:{code:error.code,message:error.message} } }
  }
  const client = {
    rpc: (name, payload) => name === 'admin_save_product'
      ? result('select admin_save_product($1::jsonb,$2::jsonb,$3::timestamptz) result', [JSON.stringify(payload.p_product),JSON.stringify(payload.p_variants),payload.p_expected_updated_at])
      : result('select admin_save_product_prices($1,$2,$3,$4::jsonb,$5) result', [payload.p_id,payload.p_price,payload.p_old_price,JSON.stringify(payload.p_variants),payload.p_expected_updated_at]),
    from(table) {
      let operation, value
      const where = []
      const builder = {
        async upsert(rows) {
          try {
            for (const row of rows) await db.query('insert into site_settings(key,value) values($1,$2) on conflict(key) do update set value=excluded.value',[row.key,row.value])
            return {error:null}
          } catch (error) {return {error:{message:error.message}}}
        },
        insert(row) { operation='insert';value=row;return builder },
        update(row) { operation='update';value=row;return builder },
        delete() { operation='delete';return builder },
        eq(key,val) { where.push([key,val]);return builder },
        select() { return builder },
        async single() {
          const values = [], parameter = val => { values.push(val);return `$${values.length}` }
          const columns = Object.keys(value ?? {})
          const condition = () => where.map(([key,val]) => `${key}=${parameter(val)}`).join(' and ')
          const sql = operation === 'insert' ? `insert into ${table}(${columns.join(',')}) values(${columns.map(key=>parameter(value[key])).join(',')})`
            : operation === 'delete' ? `delete from ${table} where ${condition()}`
            : `update ${table} set ${columns.map(key=>`${key}=${parameter(value[key])}`).join(',')} where ${condition()}`
          return result(`${sql} returning to_jsonb(${table}.*) result`,values)
        },
      }
      return builder
    },
  }
  const load = modules({
    react:{cache:fn=>fn},
    'next/cache':{revalidateTag:(tag,options)=>{invalidated.push([tag,options]);cached.clear()},revalidatePath:(...args)=>paths.push(args)},
    'next/navigation':{redirect:()=>{}},
    '@/lib/auth':{isAdmin:async()=>authorized,getViewer:async()=>({user:authorized?{id:'test'}:null,admin:authorized})},
    '@/lib/supabase/server':{createClient:async()=>client},
    '@/lib/products/images':{managedImagePath:()=>null},
  }, environment)
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer public-anon')
      if (url.includes('/store_revision?')) { revisionReads++;assert.equal(options.cache,'no-store');return Response.json((await db.query('select version::text from store_revision')).rows) }
      assert.equal(options.cache,'force-cache')
      assert.equal(options.next.revalidate,300)
      assert.deepEqual(options.next.tags,['store-catalogue'])
      if (!cached.has(url)) { reads++;cached.set(url,(await db.query('select get_store_catalogue(null) data')).rows[0].data) }
      return Response.json(cached.get(url))
    }
    const { getStoreCatalogue } = load('@/lib/store-catalogue')
    const actions = load('@/app/admin/actions')
    const api = load('@/app/api/admin/products/route')
    assert.equal((await getStoreCatalogue()).products.length,0)
    await getStoreCatalogue()
    assert.equal(reads,1)
    assert.equal(revisionReads,2)
    assert.equal((await actions.saveStoreCategory({slug:'care',name_ar:'عناية من القاعدة',parent_slug:null,sort_order:0,is_active:true,updated_at:null})).ok,true)
    const id = randomUUID()
    const draft = {id,slug:'db-only',updatedAt:null,name_ar:'منتج من القاعدة',name_en:'DB',category:'care',category_label:'عناية',price:6,old_price:9,stock_quantity:4,category_slugs:['care'],description:'وصف من القاعدة',badge:null,benefits:[],is_active:true,is_featured:false,sort_order:3,variants:[]}
    const save = async product => {
      const form = new FormData();form.set('product',JSON.stringify(product))
      const response = await api.POST(new Request('https://store.test/api/admin/products',{method:'POST',body:form,headers:{origin:'https://store.test',host:'store.test'}}))
      return response.json()
    }
    assert.equal((await save(draft)).ok,true)
    let catalog = await getStoreCatalogue()
    assert.equal(catalog.products[0].price,6)
    assert.equal(catalog.products[0].stockQuantity,4)
    assert.equal(catalog.products[0].categoryLabel,'عناية من القاعدة')
    assert.equal(catalog.products[0].imageUrl,null)
    // A database-side change must bypass the previous revision even without an app invalidation.
    await db.query("update products set price=6.5,image_url='https://database.test/storage/v1/object/public/product-images/new-image.webp' where id=$1",[id])
    catalog=await getStoreCatalogue()
    assert.equal(catalog.products[0].price,6.5)
    assert.equal(catalog.products[0].imageUrl,'https://database.test/storage/v1/object/public/product-images/new-image.webp')
    const categoryBefore=(await db.query('select updated_at::text from store_categories where slug=$1',['care'])).rows[0]
    assert.equal((await actions.saveStoreCategory({slug:'care',name_ar:'اسم القسم المعدل',parent_slug:null,sort_order:5,is_active:true,updated_at:categoryBefore.updated_at})).ok,true)
    assert.equal((await getStoreCatalogue()).products[0].categoryLabel,'اسم القسم المعدل')
    assert.equal((await actions.saveSettings({whatsapp_number:'',whatsapp_message:'',email:'',instagram_url:'',facebook_url:'',currency:'JOD',store_tagline:'نص محفوظ',store_announcement:'إعلان محفوظ',store_free_shipping_threshold:'40',store_shipping_fee:'1.75'})).ok,true)
    assert.equal((await getStoreCatalogue()).settings.storeShippingFee,1.75)
    let version = (await db.query('select updated_at::text from products where id=$1',[id])).rows[0].updated_at
    assert.equal((await save({...draft,updatedAt:version,price:7,stock_quantity:0,description:'الوصف المعدل',sort_order:-1})).ok,true)
    catalog=await getStoreCatalogue()
    assert.equal(catalog.products[0].price,7)
    assert.equal(catalog.products[0].stockQuantity,0)
    assert.equal(catalog.products[0].description,'الوصف المعدل')
    version=(await db.query('select updated_at::text from products where id=$1',[id])).rows[0].updated_at
    assert.equal((await actions.saveProductPrices({productId:id,updatedAt:version,price:8,oldPrice:9,variantPrices:{}})).ok,true)
    assert.equal((await getStoreCatalogue()).products[0].price,8)
    assert.equal((await actions.setProductFlags(id,{is_active:false})).ok,true)
    assert.equal((await getStoreCatalogue()).products.length,0)
    assert.equal((await actions.setProductFlags(id,{is_active:true})).ok,true)
    version=(await db.query('select updated_at::text from products where id=$1',[id])).rows[0].updated_at
    const response=await api.DELETE(new Request(`https://store.test/api/admin/products?id=${id}&version=${encodeURIComponent(version)}`,{method:'DELETE',headers:{origin:'https://store.test',host:'store.test'}}))
    assert.equal((await response.json()).ok,true)
    assert.equal((await getStoreCatalogue()).products.length,0)
    const category=(await db.query('select updated_at::text from store_categories where slug=$1',['care'])).rows[0]
    assert.equal((await actions.deleteStoreCategory('care',category.updated_at)).ok,true)
    assert.equal((await getStoreCatalogue()).categories.length,0)
    assert.ok(invalidated.length>=8)
    assert.ok(invalidated.every(([tag,options])=>tag==='store-catalogue'&&options.expire===0))
    assert.ok(paths.some(([path,type])=>path==='/category'&&type==='layout'))
    authorized=false
    const previous=invalidated.length
    assert.equal((await save(draft)).ok,false)
    assert.equal(invalidated.length,previous)
    // No configuration and backend errors must never resurrect preview data.
    delete environment.NEXT_PUBLIC_SUPABASE_URL
    assert.deepEqual((await getStoreCatalogue()).products,[])
    environment.NEXT_PUBLIC_SUPABASE_URL='https://database.test'
    globalThis.fetch=async()=>new Response('unavailable',{status:503})
    assert.equal((await getStoreCatalogue()).unavailable,true)
    assert.deepEqual((await getStoreCatalogue()).products,[])
  } finally {
    globalThis.fetch=oldFetch
    await db.close()
  }
})
