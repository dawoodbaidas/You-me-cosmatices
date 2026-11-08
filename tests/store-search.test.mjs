import test from 'node:test'
import assert from 'node:assert/strict'
import { modules } from './helpers/load-app.mjs'
import { PGlite } from '@electric-sql/pglite'

test('search normalizes Arabic, bounds results, and treats regex/PostgREST punctuation literally', async () => {
  const { searchFilters } = modules()('@/lib/search')
  assert.deepEqual(searchFilters('  '), { limit: '0' })
  const db = new PGlite()
  try {
    for (const [query, text, matches] of [['الوه', 'أَلُوَة', true], ['MIST', 'Body Mist', true], ['.*', 'Anything', false], ['(a,b)."\\', '(a,b)."\\', true]]) {
      const filters = searchFilters(query)
      assert.equal(filters.limit, '40')
      const quoted = filters.and.match(/name_ar\.imatch\.("(?:\\.|[^"\\])*")/)[1]
      const pattern = JSON.parse(quoted)
      const result = await db.query('select $1 ~* $2 as matched', [text, pattern])
      assert.equal(result.rows[0].matched, matches, query)
    }
  } finally { await db.close() }
})

test('empty search returns without reading database; nonempty search uses bounded reader', async () => {
  const calls = []
  const { GET } = modules({ '@/lib/store-catalogue': { getStoreProducts: async (...args) => { calls.push(args); return { products: [], revision: '1' } } } })('@/app/api/store/products/route')
  assert.deepEqual(await (await GET(new Request('https://store.test/api/store/products?q=%20'))).json(), [])
  assert.equal(calls.length, 0)
  await GET(new Request('https://store.test/api/store/products?q=mist'))
  assert.deepEqual(calls, [['search', 'mist']])
  assert.equal((await GET(new Request('https://store.test/api/store/products?q=' + 'x'.repeat(121)))).status, 400)
})

test('root with children reads no products; child and root without children read only direct membership', async () => {
  const categories = [
    { slug: 'root', name_ar: 'Root', parent_slug: null, is_active: true },
    { slug: 'child', name_ar: 'Child', parent_slug: 'root', is_active: true },
    { slug: 'leaf', name_ar: 'Leaf', parent_slug: 'child', is_active: true },
    { slug: 'solo', name_ar: 'Solo', parent_slug: null, is_active: true },
  ]
  const reads = []
  const load = modules({
    'next/navigation': { notFound() { throw Error('404') }, redirect() { throw Error('redirect') } },
    '@/components/Storefront': { StorePage: () => null },
    '@/lib/store-catalogue': { getStoreNavigation: async () => ({ categories, products: [] }), getCategoryProducts: async slug => { reads.push(slug); return [{ id: slug }] }, publicDatabaseConfig: () => null },
  })
  const { categoryPath } = load('@/lib/store-categories')
  const page = load('@/app/(store)/categories/[...path]/page').default
  for (const category of categories) {
    const path = categoryPath(category, categories).split('/').slice(2)
    const result = await page({ params: Promise.resolve({ path }), searchParams: Promise.resolve({}) })
    assert.deepEqual(result.props.data.products, category.slug === 'root' ? [] : [{ id: category.slug }])
  }
  assert.deepEqual(reads, ['child', 'leaf', 'solo'])
  await assert.rejects(page({ params: Promise.resolve({ path: ['missing'] }), searchParams: Promise.resolve({}) }), /404/)
})
