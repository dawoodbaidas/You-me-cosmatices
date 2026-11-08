// Warm the existing revision-keyed server cache, never cache a priced page in
// the router. The actual navigation still verifies the current DB revision.
let pending: { slug: string; controller: AbortController } | undefined
let warmed: { slug: string; at: number } | undefined
export function prefetchCategory(slug: string, request: typeof fetch = fetch) {
  if (pending?.slug === slug || (warmed?.slug === slug && Date.now() - warmed.at < 10_000)) return
  pending?.controller.abort()
  const current = { slug, controller: new AbortController() }
  pending = current
  void request(`/api/store/products?category=${encodeURIComponent(slug)}`, {
    method: 'HEAD', cache: 'no-store', signal: current.controller.signal,
  }).then(response => {
    if (response.ok && !current.controller.signal.aborted) warmed = { slug, at: Date.now() }
  }).catch(() => { /* Navigation owns errors; a speculative read must not block it. */ })
    .finally(() => { if (pending === current) pending = undefined })
}
