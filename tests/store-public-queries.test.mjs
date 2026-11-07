import test from 'node:test'
import assert from 'node:assert/strict'
import { modules } from './helpers/load-app.mjs'

test('public readers use narrow filters, share one revision per render, cache for 30s and fail closed', async () => {
  const oldFetch = globalThis.fetch
  const requests = [], persistent = new Map()
  let render = new Map(), revision = '10', fail = false
  const a = '00000000-0000-4000-8000-000000000001'
  const b = '00000000-0000-4000-8000-000000000002'
  const rows = [a,b].map((id, i) => ({id,slug:i?'other':'selected',name_ar:'Product',name_en:'Product',price:5,old_price:null,category:'care',category_label:'Care',image_url:'/image.webp',product_categories:[{category_slug:'leaf'},{category_slug:'child'}],product_variants:[],is_active:true,sort_order:i}))
  const load = modules({
    react: { cache: fn => (...args) => {
      const key = fn.toString()+JSON.stringify(args)
      if (!render.has(key)) render.set(key, fn(...args))
      return render.get(key)
    } },
    'next/cache': { unstable_cache: (fn, parts, options) => async (...args) => {
      assert.equal(options.revalidate, 30)
      assert.deepEqual(options.tags, ['store-catalogue'])
      const key = JSON.stringify([parts,args])
      if (!persistent.has(key)) persistent.set(key, await fn(...args))
      return persistent.get(key)
    } },
  }, { NEXT_PUBLIC_SUPABASE_URL:'https://db.test',NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon' })
  globalThis.fetch = async (input, options) => {
    const url = new URL(input)
    requests.push(url)
    assert.equal(options.headers.Authorization, 'Bearer anon')
    if (fail) return new Response('',{status:503})
    assert.equal(options.cache, 'no-store')
    if (url.pathname.endsWith('store_revision')) return Response.json([{version:revision}])
    if (url.pathname.endsWith('store_categories')) return Response.json([{slug:'child',name_ar:'Renamed',is_active:true,parent_slug:null},{slug:'leaf',name_ar:'Leaf',is_active:true,parent_slug:'child'}])
    if (url.pathname.endsWith('site_settings')) return Response.json([])
    if (url.pathname.endsWith('home_section_products')) return Response.json([{section:'hero',product_id:a,position:0}])
    assert.ok(url.pathname.endsWith('/products'), 'no full-catalogue RPC')
    if (url.searchParams.has('slug')) return Response.json(rows.filter(row => `eq.${row.slug}` === url.searchParams.get('slug')))
    if (url.searchParams.has('id')) return Response.json(rows.filter(row => url.searchParams.get('id').includes(row.id)))
    assert.equal(url.searchParams.get('membership.category_slug'), 'eq.leaf')
    assert.ok(url.searchParams.get('select').includes('product_categories(category_slug),membership:product_categories!inner'))
    return Response.json(rows)
  }
  try {
    const { getStoreProducts, getStoreNavigation, getStoreHome } = load('@/lib/store-catalogue')
    const [single, category, home] = await Promise.all([getStoreProducts('slug','selected'),getStoreProducts('category','leaf'),getStoreHome(),getStoreNavigation()])
    assert.equal(requests.filter(url=>url.pathname.endsWith('store_revision')).length,1)
    assert.equal(single.products.length,1)
    assert.deepEqual(home.products.map(p=>p.id),[a])
    assert.deepEqual(home.homeSections,{hero:[a],bestsellers:[]})
    assert.deepEqual(category.products[0].categorySlugs,['leaf','child'])
    assert.equal(category.products[0].categoryLabel,'Renamed')
    render = new Map()
    const before = requests.length
    await getStoreProducts('slug','selected')
    assert.equal(requests.length,before+1,'next render reads only uncached revision')
    revision='11'; rows[0].image_url='/replacement.webp'; rows[0].price=7
    render = new Map()
    const updated = await getStoreProducts('ids',a)
    assert.equal(updated.revision,'11')
    assert.equal(updated.products[0].imageUrl,'/replacement.webp')
    assert.equal(updated.products[0].price,7)
    render = new Map(); fail=true
    const unavailable = await getStoreProducts('slug','selected')
    assert.equal(unavailable.unavailable,true)
    assert.deepEqual(unavailable.products,[])
  } finally { globalThis.fetch=oldFetch }
})
