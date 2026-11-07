import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { modules } from './helpers/load-app.mjs'

test('product filters stay server-side, preserve memberships and use 30-row pagination', async () => {
  for (const availability of ['available', 'unavailable', 'hidden', 'invalid']) {
    const calls = []
    const client = { from(table) {
      const chain = new Proxy({}, { get(_, method) {
        if (method === 'then') return resolve => resolve({ data: [], count: 0, error: null })
        return (...args) => { calls.push([table, method, ...args]); return chain }
      } })
      return chain
    } }
    let authorized = false
    const load = modules({
      '@/lib/admin': { requireAdmin: async () => { authorized = true } },
      '@/lib/supabase/server': { createClient: async () => client },
      '@/lib/store-catalogue': { EMPTY_STORE_SETTINGS: {} },
      '@/components/admin/ProductManager': { default: () => null },
    })
    await load('@/app/admin/(dashboard)/products/page').default({ searchParams: Promise.resolve({ q: 'cream', page: '2', category: 'child', availability }) })
    assert.ok(authorized)
    const productCalls = calls.filter(call => call[0] === 'products')
    assert.ok(productCalls.some(call => call[1] === 'range' && call[2] === 30 && call[3] === 59))
    assert.ok(productCalls.some(call => call[1] === 'select' && call[2].includes('product_categories(category_slug)') && call[2].includes('category_filter:product_categories!inner')))
    assert.ok(productCalls.some(call => call[1] === 'eq' && call[2] === 'category_filter.category_slug' && call[3] === 'child'))
    if (availability === 'available') assert.ok(productCalls.some(call => call[1] === 'or' && call[2] === 'stock_quantity.is.null,stock_quantity.gt.0'))
    if (availability === 'unavailable') assert.ok(productCalls.some(call => call[1] === 'or' && call[2] === 'is_out_of_stock.eq.true,stock_quantity.eq.0'))
    if (availability === 'hidden') assert.ok(productCalls.some(call => call[1] === 'eq' && call[2] === 'is_active' && call[3] === false))
    assert.ok(productCalls.some(call => call[1] === 'or' && call[2].includes('name_ar.ilike.%cream%')))
  }
})

test('hierarchy labels distinguish nested categories and tolerate cycles', () => {
  const { adminCategoryLabel } = modules()('@/lib/admin-categories')
  const categories = [{ slug: 'root', name_ar: 'Root' }, { slug: 'child', parent_slug: 'root', name_ar: 'Child' }, { slug: 'leaf', parent_slug: 'child', name_ar: 'Leaf' }]
  assert.equal(adminCategoryLabel(categories[2], categories), 'Root / Child / Leaf')
  categories[0].parent_slug = 'leaf'
  assert.equal(adminCategoryLabel(categories[2], categories), 'Root / Child / Leaf')
})

test('organized product editor retains all submitted fields and image editor', () => {
  const load = modules({
    'next/navigation': { useRouter: () => ({}) },
    '@/app/admin/actions': {},
  })
  const { FullProductEditor } = load('@/components/admin/ProductManager')
  const html = renderToStaticMarkup(createElement(FullProductEditor, { product: null, categories: [], onCancel() {}, onSaved() {}, onError() {} }))
  for (const name of ['name_ar', 'name_en', 'slug', 'description', 'benefits', 'original_price', 'stock_quantity', 'is_out_of_stock', 'is_new', 'sort_order', 'is_active', 'is_featured']) assert.ok(html.includes(`name="${name}"`), name)
  assert.ok(html.includes('type="file"'))
  assert.equal((html.match(/<legend class="px-2 font-bold">/g) ?? []).length, 6)
})
