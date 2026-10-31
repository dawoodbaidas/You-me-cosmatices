import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTaxonomy, findCollection } from '../src/lib/taxonomy.ts'

test('label-based departments overlap without duplicating records and unknown labels stay accessible',()=>{
 const products=[
  {id:'1',slug:'wild-colt-assaf-for-men',category:'skincare',categoryLabel:'عطور رجالية'},
  {id:'2',slug:'mens-classic-leather-wallet',category:'skincare',categoryLabel:'الإكسسوارات الرجالية'},
  {id:'3',slug:'new-unknown',category:'skincare',categoryLabel:'تصنيف جديد'},
 ]
 const groups=buildTaxonomy(products)
 assert.deepEqual(findCollection(groups,'men').productIds,['1','2'])
 assert.deepEqual(findCollection(groups,'fragrance-men').productIds,['1'])
 assert.deepEqual(findCollection(groups,'wallets').productIds,['2'])
 assert.deepEqual(findCollection(groups,'other').productIds,['3'])
 assert.equal(products.length,3)
})
