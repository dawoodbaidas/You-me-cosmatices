import { getStoreProducts } from '@/lib/store-catalogue'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const ids = params.get('ids')
    const query = params.get('q')
    const category = params.get('category')
    if (category !== null && (!category.trim() || category.length > 160 || /[(),]/.test(category))) return Response.json({ error: 'Invalid category' }, { status: 400 })
    if (query !== null && !query.trim()) return Response.json([], { headers: { 'Cache-Control': 'no-store' } })
    if (query && query.length > 120) return Response.json({ error: 'Query too long' }, { status: 400 })
    const keys = ids === null ? [] : [...new Set(ids.split(',').filter(Boolean))].sort()
    if (keys.length > 100 || keys.some(id => !/^[0-9a-f-]{36}$/i.test(id))) return Response.json({ error: 'Invalid products' }, { status: 400 })
    const store = await getStoreProducts(query !== null ? 'search' : ids !== null ? 'ids' : category !== null ? 'category' : 'all', query ?? (ids !== null ? keys.join(',') : category ?? ''))
    if (store.unavailable || !store.revision) throw new Error('Store unavailable')
    // Arrays remain compatible with existing consumers; the revision travels with
    // the response so a slow request cannot relabel old data as a newer snapshot.
    return Response.json(store.products, { headers: { 'X-Store-Revision': store.revision, 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ error: 'تعذّر تحميل المنتجات. حاول مجددًا.' }, { status: 503 }) }
}
