import { getStoreProducts } from '@/lib/store-catalogue'

export async function GET(request: Request) {
  try {
    const ids = new URL(request.url).searchParams.get('ids')
    const keys = ids === null ? [] : [...new Set(ids.split(',').filter(Boolean))].sort()
    if (keys.length > 100 || keys.some(id => !/^[0-9a-f-]{36}$/i.test(id))) return Response.json({ error: 'Invalid products' }, { status: 400 })
    const store = await getStoreProducts(ids === null ? 'all' : 'ids', keys.join(','))
    if (store.unavailable || !store.revision) throw new Error('Store unavailable')
    // Arrays remain compatible with existing consumers; the revision travels with
    // the response so a slow request cannot relabel old data as a newer snapshot.
    return Response.json(store.products, { headers: { 'X-Store-Revision': store.revision, 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ error: 'تعذّر تحميل المنتجات. حاول مجددًا.' }, { status: 503 }) }
}
