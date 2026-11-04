import { test } from 'node:test'
import assert from 'node:assert/strict'
import { storeCollections, findCollection, collectionHref } from '../src/lib/store-categories.ts'

test('department counts include descendants once and links resolve shared catalogue routes', () => {
  const categories = [
    { slug: 'care', name_ar: 'Care', parent_slug: null, is_active: true, sort_order: 0 },
    { slug: 'skin', name_ar: 'Skin', parent_slug: 'care', is_active: true, sort_order: 1 },
  ]
  const products = [
    { id: 'one', categorySlugs: ['care', 'skin'] },
    { id: 'two', categorySlugs: ['skin'] },
    { id: 'three', categorySlugs: [] },
  ]
  const groups = storeCollections(categories, products)
  assert.deepEqual(groups[0].productIds, ['one', 'two'])
  assert.equal(findCollection(groups, 'skin').productIds.length, 2)
  assert.equal(collectionHref(null), '/category/all')
  assert.equal(collectionHref(groups[0].id), '/category/care')
})
