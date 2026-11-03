import { test } from 'node:test'
import assert from 'node:assert/strict'
import { storeCollections, findCollection } from '../src/lib/store-categories.ts'
test('admin categories preserve new long names, nested membership and empty categories', () => {
 const category = (slug,name_ar,parent_slug=null) => ({slug,name_ar,parent_slug,is_active:true,sort_order:0})
 const longName='قسم جديد من الأدمن للعناية اليومية بالبشرة والجسم والأسماء الطويلة'
 const groups=storeCollections([category('care','العناية'),category('new',longName,'care'),category('empty','فارغ')],[{id:'p',categorySlugs:['new']}])
 assert.equal(findCollection(groups,'new').label,longName)
 assert.deepEqual(findCollection(groups,'care').productIds,['p'])
 assert.deepEqual(findCollection(groups,'empty').productIds,[])
})
