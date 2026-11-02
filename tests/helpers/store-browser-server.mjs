// Isolated loopback QA database. Never imported by application code.
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { storeDatabase } from './store-database.mjs'

export async function startStoreBrowserDatabase() {
const db = await storeDatabase()
await db.exec("insert into store_categories(slug,name_ar,sort_order) values('perfumes','العطور',0),('care','العناية',1),('empty','قسم فارغ',2)")
const source = JSON.parse(await readFile(new URL('../../src/data/preview-products.json', import.meta.url), 'utf8'))
for (const product of source) {
  const id = randomUUID()
  const row = {id,slug:product.slug,name_ar:product.nameAr,name_en:product.nameEn,category:product.category,category_label:product.categoryLabel,price:product.price,old_price:product.oldPrice,description:product.description,badge:product.badge,benefits:product.benefits,is_active:true,is_featured:product.isFeatured,sort_order:product.sortOrder,image_url:product.imageUrl,stock_quantity:8,category_slugs:[product.category==='mist'?'perfumes':'care']}
  await db.query('select admin_save_product($1::jsonb,$2::jsonb,null)',[JSON.stringify(row),JSON.stringify(product.variants.map((variant,index)=>({id:randomUUID(),label:variant.label,price:variant.price,is_active:true,sort_order:index})))])
}
await db.exec("insert into site_settings(key,value) values('currency','JOD'),('whatsapp_number','962700000000'),('whatsapp_message','طلب اختبار معزول'),('store_announcement','بيانات قاعدة الاختبار المعزولة'),('store_free_shipping_threshold','30')")
let revisionReads=0,catalogueReads=0,delay=0
let queue=Promise.resolve()
const query = (sql,params,publicRead=false) => {
  const work = queue.then(async()=>{
    if(publicRead)await db.exec('set role anon')
    try{return await db.query(sql,params)}finally{if(publicRead)await db.exec('set role authenticated')}
  })
  queue=work.catch(()=>{})
  return work
}
const server=http.createServer(async(request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1')
  response.setHeader('Access-Control-Allow-Origin','*')
  response.setHeader('Content-Type','application/json')
  try{
    let data
    if(url.pathname==='/rest/v1/store_revision'){
      revisionReads++;data=(await query('select version::text from store_revision',[],true)).rows
    }else if(url.pathname==='/rest/v1/rpc/get_store_catalogue'){
      catalogueReads++
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay))
      data=(await query('select get_store_catalogue(null) data',[],true)).rows[0].data
    }else if(url.pathname==='/rest/v1/products'){
      data=(await query("select to_jsonb(p)||jsonb_build_object('product_variants',coalesce((select jsonb_agg(v) from product_variants v where v.product_id=p.id),'[]'::jsonb)) data from products p where is_active order by sort_order,id",[],true)).rows.map(row=>row.data)
    }else if(url.pathname==='/rest/v1/site_settings'){
      data=(await query('select key,value from site_settings',[],true)).rows
    }else if(url.pathname==='/__test/stats'){
      data={revisionReads,catalogueReads}
    }else if(url.pathname==='/__test/edit'&&request.method==='POST'){
      delay=Number(url.searchParams.get('delay')??0)
      await query("update products set price=4.321,old_price=null,description='وصف معدل في قاعدة الاختبار',stock_quantity=0 where slug='body-mist'")
      data={ok:true}
    }else{
      response.statusCode=404;data={error:'Unknown QA endpoint'}
    }
    response.end(JSON.stringify(data))
  }catch(error){response.statusCode=500;response.end(JSON.stringify({error:error.message}))}
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
return {
  url: `http://127.0.0.1:${server.address().port}`,
  async close() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await db.close() },
}
}
