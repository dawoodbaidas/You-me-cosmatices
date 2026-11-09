// Warm the revision-keyed data while Next partially prefetches the loading shell.
// The dynamic page still verifies the current DB revision on navigation.
let pending: { slug: string; controller: AbortController } | undefined
let warmed: { slug: string; at: number } | undefined
export function prefetchCategory(slug: string, request: typeof fetch = fetch) {
  if (pending?.slug === slug || (warmed?.slug === slug && Date.now() - warmed.at < 10_000)) return
  pending?.controller.abort()
  const started = process.env.NODE_ENV !== 'production' && typeof performance !== 'undefined' ? performance.now() : 0
  const current = { slug, controller: new AbortController() }
  pending = current
  void request(`/api/store/products?category=${encodeURIComponent(slug)}`, {
    method: 'HEAD', cache: 'no-store', signal: current.controller.signal,
  }).then(response => {
    if (process.env.NODE_ENV !== 'production') response.headers.forEach((value, header) => {
      if (header.toLowerCase() === 'server-timing') console.debug(`[store-prefetch] ${response.status} ${slug}`, value, `${Math.round(performance.now() - started)}ms client`)
    })
    if (response.ok && !current.controller.signal.aborted) warmed = { slug, at: Date.now() }
  }).catch(() => { /* Navigation owns errors; a speculative read must not block it. */ })
    .finally(() => { if (pending === current) pending = undefined })
}
