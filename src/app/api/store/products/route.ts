import { getStoreProducts } from '@/lib/store-catalogue'

async function resolve(request: Request) {
  const started = performance.now()
  const params = new URL(request.url).searchParams
  const ids = params.get('ids')
  const query = params.get('q')
  const category = params.get('category')
  if (category !== null && (!category.trim() || category.length > 160 || /[(),]/.test(category))) return { status: 400, body: { error: 'Invalid category' } as unknown }
  if (query !== null && !query.trim()) return { status: 200, body: [] as unknown }
  if (query && query.length > 120) return { status: 400, body: { error: 'Query too long' } as unknown }
  const keys = ids === null ? [] : [...new Set(ids.split(',').filter(Boolean))].sort()
  if (keys.length > 100 || keys.some(id => !/^[0-9a-f-]{36}$/i.test(id))) return { status: 400, body: { error: 'Invalid products' } as unknown }
  try {
    const store = await getStoreProducts(query !== null ? 'search' : ids !== null ? 'ids' : category !== null ? 'category' : 'all', query ?? (ids !== null ? keys.join(',') : category ?? ''))
    if (store.unavailable || !store.revision) return { status: 503, body: { error: 'تعذّر تحميل المنتجات. حاول مجددًا.' } as unknown }
    const duration = Math.round(performance.now() - started)
    return { status: 200, revision: store.revision, duration, body: store.products as unknown }
  } catch { return { status: 503, body: { error: 'تعذّر تحميل المنتجات. حاول مجددًا.' } as unknown } }
}

export async function GET(request: Request) {
  const result = await resolve(request)
  // Server-Timing makes Click → Data → Render attributable per request in the
  // browser devtools and the Next dev logs without any client instrumentation.
  const timing = result.duration !== undefined ? { 'Server-Timing': `store;dur=${result.duration}` } : undefined
  // Arrays remain compatible with existing consumers; the revision travels with
  // the response so a slow request cannot relabel old data as a newer snapshot.
  return Response.json(result.body, { status: result.status, headers: { 'X-Store-Revision': result.revision ?? '', 'Cache-Control': 'no-store', ...timing } })
}

// Without an explicit HEAD handler Next runs the full GET handler and must then
// discard the serialized body. This skips the body entirely while still going
// through the same cache pipeline, which is what hover prefetch actually needs.
export async function HEAD(request: Request) {
  const result = await resolve(request)
  return new Response(null, { status: result.status, headers: { 'X-Store-Revision': result.revision ?? '', 'Cache-Control': 'no-store' } })
}
