import type { Product } from '@/types/product'

export function newerRevision(candidate: string | null, current: string | null) {
  return candidate !== null && (current === null || BigInt(candidate) > BigInt(current))
}

/** A shell-local public cache. A missing ID is remembered only for this revision. */
export function createPublicProducts() {
  let snapshot: { revision: string | null; products: Product[]; complete: boolean } = { revision: null, products: [], complete: false }
  const initial = snapshot
  const records = new Map<string, Product | null>()
  const listeners = new Set<() => void>()
  const pending = new Map<string, Promise<void>>()
  const publish = () => {
    snapshot = { ...snapshot, products: [...records.values()].filter((item): item is Product => item !== null) }
    listeners.forEach(listener => listener())
  }
  const seed = (products: Product[], revision: string | null, complete = false, requested: string[] = []) => {
    if (!revision || (snapshot.revision && newerRevision(snapshot.revision, revision))) return
    if (newerRevision(revision, snapshot.revision)) {
      records.clear()
      snapshot = { revision, products: [], complete: false }
    }
    if (complete) { records.clear(); snapshot = { ...snapshot, complete: true } }
    requested.forEach(id => records.set(id, null))
    products.forEach(product => records.set(product.id, product))
    publish()
  }
  const missing = (ids: string[]) => snapshot.complete ? [] : [...new Set(ids)].filter(id => !records.has(id)).sort()
  const load = (ids?: string[]): Promise<void> => {
    if (snapshot.complete) return Promise.resolve()
    const keys = ids ? missing(ids) : undefined
    if (keys && !keys.length) return Promise.resolve()
    if (keys && keys.length > 100) return Promise.all(Array.from({ length: Math.ceil(keys.length / 100) }, (_, i) => load(keys.slice(i * 100, (i + 1) * 100)))).then(() => {})
    const key = `${snapshot.revision}:${keys?.join(',') ?? 'all'}`
    const all = pending.get(`${snapshot.revision}:all`)
    if (all) return all
    const existing = pending.get(key)
    if (existing) return existing
    const request = (async () => {
      const response = await fetch('/api/store/products' + (keys ? `?ids=${encodeURIComponent(keys.join(','))}` : ''), { cache: 'no-store' })
      if (!response.ok) throw new Error('Products unavailable')
      const revision = response.headers.get('X-Store-Revision')
      if (!revision || !/^\d+$/.test(revision)) throw new Error('Invalid store revision')
      const products: Product[] = await response.json()
      if (!Array.isArray(products)) throw new Error('Invalid products')
      seed(products, revision, !keys, keys)
    })().finally(() => { pending.delete(key) })
    pending.set(key, request)
    return request
  }
  return {
    seed, load, missing,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}
