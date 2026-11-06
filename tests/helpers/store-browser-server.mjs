// Isolated loopback QA database. Never imported by application code.
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { storeDatabase } from './store-database.mjs'
import sharp from 'sharp'

export async function startStoreBrowserDatabase() {
const db = await storeDatabase()
await db.exec("insert into store_categories(slug,name_ar,sort_order) values('perfumes','العطور',0),('care','العناية',1),('empty','قسم فارغ',2)")
await db.exec("insert into store_categories(slug,name_ar,parent_slug) values('child','العناية اليومية','care'),('leaf','منتجات يومية','child')")
const source = JSON.parse(await readFile(new URL('../../src/data/preview-products.json', import.meta.url), 'utf8'))
for (const product of source) {
  const id = randomUUID()
  const row = {id,slug:product.slug,name_ar:product.nameAr,name_en:product.nameEn,category:product.category,category_label:product.categoryLabel,price:product.price,old_price:product.oldPrice,description:product.description,badge:product.badge,benefits:product.benefits,is_active:true,is_featured:product.isFeatured,sort_order:product.sortOrder,image_url:product.imageUrl,stock_quantity:8,category_slugs:[product.category==='mist'?'perfumes':'care']}
  await db.query('select admin_save_product($1::jsonb,$2::jsonb,null)',[JSON.stringify(row),JSON.stringify(product.variants.map((variant,index)=>({id:randomUUID(),label:variant.label,price:variant.price,is_active:true,sort_order:index})))])
}
await db.exec("insert into site_settings(key,value) values('currency','JOD'),('whatsapp_number','962700000000'),('whatsapp_message','طلب اختبار معزول'),('store_announcement','بيانات قاعدة الاختبار المعزولة'),('store_free_shipping_threshold','30')")
for (const section of ['hero', 'bestsellers']) {
  const ids = (await db.query("select id from products where slug=any($1) order by array_position($1,slug)", [['body-mist','aloe-foam','foundation','mascara','musk-tahara-oil']])).rows.map(row=>row.id)
  const version = (await db.query('select updated_at from home_sections where section=$1',[section])).rows[0].updated_at
  await db.query('select admin_save_home_section($1,$2,$3)',[section,ids,version])
}
let revisionReads=0,catalogueReads=0,productReads=0,categoryReads=0,delay=0
const categoryImages = new Map()
await db.exec("insert into product_categories select id,'leaf' from products where category<>'mist' limit 3")
await db.exec("insert into product_categories select id,'child' from products where category<>'mist' order by sort_order,id limit 2")
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
  response.setHeader('Access-Control-Allow-Headers','authorization,apikey,x-client-info,content-type')
  if(request.method==='OPTIONS'){response.end();return}
  response.setHeader('Content-Type','application/json')
  try{
    let data
    if(url.pathname==='/rest/v1/store_revision'){
      revisionReads++;data=(await query('select version::text from store_revision',[],true)).rows
    }else if(url.pathname==='/rest/v1/rpc/get_store_catalogue'){
      catalogueReads++
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay))
      data=(await query('select get_store_catalogue(null) data',[],true)).rows[0].data
    }else if(url.pathname==='/rest/v1/category_paths'){
      data=(await query('select category_id from category_paths where path=$1',[url.searchParams.get('path')?.slice(3)],true)).rows
    }else if(url.pathname==='/rest/v1/store_categories'){
      categoryReads++
      data=(await query('select * from store_categories where is_active order by sort_order,slug',[],true)).rows
    }else if(url.pathname==='/rest/v1/products'){
      productReads++
      const slug=url.searchParams.get('product_categories.category_slug')?.slice(3)??null
      const ids=url.searchParams.get('id')?.slice(4,-1).split(',')??null
      data=(await query("select to_jsonb(p)||jsonb_build_object('product_variants',coalesce((select jsonb_agg(v) from product_variants v where v.product_id=p.id),'[]'::jsonb),'product_categories',coalesce((select jsonb_agg(jsonb_build_object('category_slug',pc.category_slug)) from product_categories pc where pc.product_id=p.id),'[]'::jsonb)) data from products p where is_active and ($1::text is null or exists(select 1 from product_categories pc where pc.product_id=p.id and pc.category_slug=$1)) and ($2::uuid[] is null or p.id=any($2::uuid[])) order by sort_order,id",[slug,ids],true)).rows.map(row=>row.data)
    }else if(url.pathname==='/rest/v1/site_settings'){
      data=(await query('select key,value from site_settings',[],true)).rows
    }else if(url.pathname==='/__test/stats'){
      data={revisionReads,catalogueReads,productReads,categoryReads,orders:(await query('select count(*) count from store_orders')).rows[0].count}
    }else if(url.pathname.startsWith('/storage/v1/object/public/category-images/')){
      const bytes=categoryImages.get(url.pathname.split('/category-images/')[1])
      response.statusCode=bytes?200:404
      response.setHeader('Content-Type','image/webp')
      response.setHeader('Cache-Control','public,max-age=31536000,immutable')
      response.end(bytes);return
    }else if(url.pathname==='/__test/category-image'&&request.method==='POST'){
      let body='';for await(const chunk of request)body+=chunk
      const args=JSON.parse(body)
      const row=(await query('select * from store_categories where slug=$1',[args.slug])).rows[0]
      const imagePath=`categories/${randomUUID()}/${randomUUID()}.webp`
      categoryImages.set(imagePath,await sharp({create:{width:500,height:500,channels:3,background:args.color??'#b27280'}}).webp().toBuffer())
      await query('select admin_save_category($1::jsonb,$2)',[JSON.stringify({...row,image_path:imagePath}),row.updated_at])
      data={ok:true,imagePath}
    }else if(url.pathname==='/rest/v1/rpc/create_store_order'&&request.method==='POST'){
      let body='';for await(const chunk of request)body+=chunk
      const args=JSON.parse(body)
      data=(await query('select create_store_order($1,$2::jsonb,$3) data',[args.p_id,JSON.stringify(args.p_lines),args.p_expected_total])).rows[0].data
    }else if(url.pathname==='/__test/merchandising'&&request.method==='POST'){
      let body='';for await(const chunk of request)body+=chunk
      const args=JSON.parse(body)
      if(args.section){
        const ids=(await query('select id from products where slug=any($1) order by array_position($1,slug)',[args.slugs])).rows.map(row=>row.id)
        const version=(await query('select updated_at from home_sections where section=$1',[args.section])).rows[0].updated_at
        await query('select admin_save_home_section($1,$2,$3)',[args.section,ids,version])
      }else{
        await query('update products set original_price=$2,price=$3,discount_enabled=$4,is_new=$5 where slug=$1',[args.slug,args.originalPrice,args.price,args.discountEnabled,args.isNew])
      }
      data={ok:true}
    }else if(url.pathname==='/__test/edit'&&request.method==='POST'){
      delay=Number(url.searchParams.get('delay')??0)
      await query("update products set price=4.321,original_price=4.321,discount_enabled=false,old_price=null,description='وصف معدل في قاعدة الاختبار',stock_quantity=0 where slug='body-mist'")
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
