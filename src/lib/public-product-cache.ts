import type { Product } from '@/types/product'

export function compareStoreRevision(left: string | null, right: string | null) {
  if (left === right) return 0
  if (left === null) return -1
  if (right === null) return 1
  return BigInt(left) < BigInt(right) ? -1 : 1
}

type RecordEntry = { product: Product | null; expires: number }
type Snapshot = { revision: string | null; products: Product[]; searchProducts: Product[] | null }
const TTL = 30_000

// One store per mounted storefront. Only display records are cached here;
// checkout remains a fresh server/database operation.
export class PublicProductCache {
  private records = new Map<string, RecordEntry>()
  private listeners = new Set<() => void>()
  private pending = new Map<string, Promise<void>>()
  private searchIds: string[] | null = null
  private searchExpires = 0
  private snapshot: Snapshot = { revision: null, products: [], searchProducts: null }
  constructor(private request: typeof fetch = (input, init) => fetch(input, init), private now = () => Date.now()) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.snapshot
  private publish() {
    this.snapshot = {
      revision: this.snapshot.revision,
      products: [...this.records.values()].flatMap(record => record.product ? [record.product] : []),
      searchProducts: this.searchIds?.flatMap(id => this.records.get(id)?.product ?? []) ?? null,
    }
    this.listeners.forEach(listener => listener())
  }
  advance(revision: string | null) {
    if (compareStoreRevision(revision, this.snapshot.revision) <= 0) return
    this.records.clear()
    this.searchIds = null
    this.searchExpires = 0
    this.snapshot = { revision, products: [], searchProducts: null }
    this.publish()
  }
  seed(products: Product[], revision: string | null) {
    if (!revision || compareStoreRevision(revision, this.snapshot.revision) < 0) return
    this.advance(revision)
    for (const product of products) {
      const previous = this.records.get(product.id)
      // A tombstone from a current ID/full response cannot be resurrected by a
      // delayed page payload. Equal-revision records also retain newer row data.
      if (previous && (!previous.product || Date.parse(previous.product.updatedAt ?? '') > Date.parse(product.updatedAt ?? ''))) continue
      this.records.set(product.id, { product, expires: this.now() + TTL })
    }
    this.publish()
  }
  resolve(products: Product[], revision: string | null) {
    return products.flatMap(product => {
      const record = this.records.get(product.id)
      if (record) return record.product ? [record.product] : []
      return compareStoreRevision(revision, this.snapshot.revision) < 0 ? [] : [product]
    })
  }
  async load(ids?: string[]): Promise<void> {
    const revision = this.snapshot.revision
    if (!revision) throw new Error('Store revision unavailable')
    const all = ids === undefined
    if (all && this.searchIds && this.searchExpires > this.now()) return
    const keys = [...new Set(ids ?? [])].sort()
    const missing = keys.filter(id => !this.records.has(id) || this.records.get(id)!.expires <= this.now())
    const waits = new Set<Promise<void>>()
    if (!all) {
      // An overlapping search request can satisfy any ID request.
      const search = this.pending.get(`${revision}:all`)
      if (search) { await search; return this.load(ids) }
      for (const id of missing) { const pending = this.pending.get(`${revision}:${id}`); if (pending) waits.add(pending) }
    }
    const needed = missing.filter(id => !this.pending.has(`${revision}:${id}`))
    if (all || needed.length) {
      const batches = all ? [undefined] : Array.from({ length: Math.ceil(needed.length / 100) }, (_, i) => needed.slice(i * 100, (i + 1) * 100))
      for (const batch of batches) {
        const pendingKeys = batch?.map(id => `${revision}:${id}`) ?? [`${revision}:all`]
        const existing = this.pending.get(pendingKeys[0])
        if (existing) { waits.add(existing); continue }
        const promise = this.fetchProducts(batch, revision).finally(() => { pendingKeys.forEach(key => { this.pending.delete(key) }) })
        pendingKeys.forEach(key => this.pending.set(key, promise))
        waits.add(promise)
      }
    }
    await Promise.all(waits)
  }
  private async fetchProducts(ids: string[] | undefined, requestedRevision: string) {
    const response = await this.request(`/api/store/products${ids ? `?ids=${encodeURIComponent(ids.join(','))}` : ''}`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Store products unavailable')
    const revision = response.headers.get('X-Store-Revision')
    if (!revision || !/^\d+$/.test(revision)) throw new Error('Store revision missing')
    const products = await response.json() as Product[]
    if (!Array.isArray(products)) throw new Error('Invalid products response')
    if (compareStoreRevision(revision, this.snapshot.revision) < 0 || compareStoreRevision(revision, requestedRevision) < 0) return
    this.seed(products, revision)
    const returned = new Set(products.map(product => product.id))
    for (const id of ids ?? [...this.records.keys()]) {
      if (!returned.has(id)) this.records.set(id, { product: null, expires: this.now() + TTL })
    }
    if (!ids) { this.searchIds = [...returned]; this.searchExpires = this.now() + TTL }
    this.publish()
  }
}
