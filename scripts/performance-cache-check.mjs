import assert from 'node:assert/strict'
const db=process.argv[2];assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(db))
const origin='http://127.0.0.1:5090'
const post=async body=>(await fetch(origin+'/api/qa-performance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json()
const stats=async()=>(await fetch(db+'/__test/stats')).json()
await fetch(origin+'/category/all').then(r=>r.text())
const a=await stats();await fetch(origin+'/category/all').then(r=>r.text());const b=await stats();assert.equal(b.catalogueReads,a.catalogueReads)
await post({mode:'invalidate'});await fetch(origin+'/category/all').then(r=>r.text());const c=await stats();assert.ok(c.catalogueReads>b.catalogueReads)
const data=await fetch(db+'/rest/v1/rpc/get_store_catalogue').then(r=>r.json());const product=data.products.find(p=>p.slug==='body-mist');assert.ok(product)
const items=[{productId:product.id,variantId:product.product_variants?.[0]?.id??null,quantity:1}]
assert.ok((await post({items})).url)
await fetch(db+'/__test/edit',{method:'POST'})
// Checkout must bypass a previously populated display cache even before invalidation.
assert.ok((await post({items})).error)
await post({mode:'invalidate'})
const html=await fetch(origin+'/category/all').then(r=>r.text());assert.ok(html.includes('4.321'));assert.ok(html.includes('stockQuantity\\":0')||html.includes('stockQuantity":0'))
assert.ok((await post({items:[...items,...items]})).error)
console.log('PASS: catalogue reuse; real tag expiration; revised price/stock; uncached checkout rejects sold-out and duplicate lines', {before:a,repeat:b,invalidated:c})
