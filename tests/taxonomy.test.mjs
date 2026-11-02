import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTaxonomy, collectionFromSlug, collectionHref, findCollection } from '../src/lib/taxonomy.ts'

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

test('department routes resolve parents and children to their own catalogue membership', () => {
 const products = [
  { id:'perfume', slug:'mens-perfume', category:'mist', categoryLabel:'عطور رجالية' },
  { id:'lipstick', slug:'lipstick-set', category:'lips', categoryLabel:'مكياج' },
  { id:'care', slug:'aloe-foam', category:'skincare', categoryLabel:'العناية بالبشرة' },
 ]
 const groups = buildTaxonomy(products)
 assert.equal(collectionHref(null), '/category/all')
 assert.equal(collectionHref('fragrance'), '/category/perfumes')
 assert.deepEqual(collectionFromSlug(groups, 'perfumes').productIds, ['perfume'])
 assert.deepEqual(collectionFromSlug(groups, 'fragrance-men').productIds, ['perfume'])
 assert.deepEqual(collectionFromSlug(groups, 'makeup').productIds, ['lipstick'])
 for (const group of groups.flatMap(group => [group, ...group.children])) {
  assert.equal(collectionFromSlug(groups, collectionHref(group.id).split('/').at(-1)), group)
 }
 assert.equal(collectionFromSlug(groups, 'missing'), undefined)
 assert.equal(collectionFromSlug(groups, 'fragrance'), undefined)
 assert.equal(products.length, 3)
})
