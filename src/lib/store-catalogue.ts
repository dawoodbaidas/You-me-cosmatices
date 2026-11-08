import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { mapProduct, mapSettings } from './products/map'
import type { StoreCatalogue, StoreCategory } from '@/types/store'
import type { SiteSettings } from '@/types/product'
import { searchFilters } from './search'

export const STORE_CATALOGUE_TAG = 'store-catalogue'
export const EMPTY_STORE_SETTINGS: SiteSettings = {
  whatsappNumber: '', whatsappMessage: '', email: '', instagramUrl: '', facebookUrl: '',
  currency: '', storeTagline: '', storeAnnouncement: '', storeFreeShippingThreshold: 0,
}

export function publicDatabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key ? { url, headers: { apikey: key, Authorization: `Bearer ${key}` } } : null
}

// This tiny, uncached revision prevents prefetched pages and browser back/forward
// from using an old cached catalogue after a committed administrator mutation.
export const readStoreRevision = cache(async (): Promise<string | null> => {
  const config = publicDatabaseConfig()
  if (!config) return null
  const response = await fetch(`${config.url}/rest/v1/store_revision?id=eq.1&select=version`, { headers: config.headers, cache: 'no-store' })
  if (!response.ok) throw new Error('Store revision unavailable')
  const rows = await response.json() as { version: number | string }[]
  if (!rows[0]) throw new Error('Store revision missing')
  return String(rows[0].version)
})

export async function readStoreCatalogue(fresh = false): Promise<StoreCatalogue> {
  const empty: StoreCatalogue = { products: [], categories: [], settings: EMPTY_STORE_SETTINGS, revision: null, unavailable: false }
  const config = publicDatabaseConfig()
  if (!config) return empty
  try {
    const revision = await readStoreRevision()
    const response = await fetch(`${config.url}/rest/v1/rpc/get_store_catalogue?p_revision=${encodeURIComponent(revision!)}`, {
      headers: config.headers, ...(fresh ? { cache: 'no-store' as const } : { cache: 'force-cache' as const, next: { revalidate: 30, tags: [STORE_CATALOGUE_TAG] } }),
    })
    if (!response.ok) throw new Error('Store catalogue unavailable')
    const data = await response.json() as {
      products: Parameters<typeof mapProduct>[0][]; categories: StoreCategory[]
      settings: { key: string; value: string }[]; revision: number | string
      home_sections?: StoreCatalogue['homeSections']
    }
    return {
      products: data.products.map(row => {
        const product = mapProduct(row)
        const category = data.categories.find(category => product.categorySlugs?.includes(category.slug))
        return category ? { ...product, categoryLabel: category.name_ar } : product
      }), categories: data.categories,
      homeSections: data.home_sections, settings: mapSettings(data.settings, EMPTY_STORE_SETTINGS), revision: String(data.revision), unavailable: false,
    }
  } catch {
    // No demo catalogue, inferred departments, replacement images or invented prices.
    return { ...empty, unavailable: true }
  }
}

export const getStoreCatalogue = cache(() => readStoreCatalogue())

// Shared chrome never needs the product catalogue. Revision-keyed caching keeps
// immutable image URLs fresh without disabling the image or catalogue caches.
const readNavigation = cache(async (revision: string | null): Promise<StoreCatalogue> => {
  const empty: StoreCatalogue = { products: [], categories: [], settings: EMPTY_STORE_SETTINGS, revision: null, unavailable: false }
  const config = publicDatabaseConfig()
  if (!config) return empty
  try {
    if (!revision) return { ...empty, unavailable: true }
    const [categories, settings] = await Promise.all([
      publicRead<StoreCategory[]>('store_categories?select=*&is_active=eq.true&order=sort_order,slug', revision),
      publicRead<{ key: string; value: string }[]>('site_settings?select=key,value', revision),
    ])
    return { ...empty, categories, settings: mapSettings(settings, EMPTY_STORE_SETTINGS), revision }
  } catch { return { ...empty, unavailable: true } }
})

export const getStoreNavigation = cache(async (): Promise<StoreCatalogue> => {
  try { return await readNavigation(await readStoreRevision()) }
  catch { return readNavigation(null) }
})

// Revision is part of the cache identity, never an unsupported PostgREST filter.
// Keep all memberships in the result even when filtering by one membership.
const PRODUCT_SELECT = 'id,slug,name_ar,name_en,description,category,category_label,price,old_price,original_price,discount_enabled,is_new,image_url,original_image_url,processed_image_url,badge,benefits,is_active,is_featured,sort_order,updated_at,stock_quantity,is_out_of_stock,product_variants(id,product_id,label,price,is_active,sort_order),product_categories(category_slug)'
const publicReads = new Map<string, Promise<unknown>>()
async function publicRead<T>(path: string, revision: string | null): Promise<T> {
  const config = publicDatabaseConfig()
  if (!config) throw new Error('Store unavailable')
  return unstable_cache(async () => {
    const key = JSON.stringify([config.url, revision, path])
    const existing = publicReads.get(key)
    if (existing) return existing as Promise<T>
    // Coalesce overlapping prewarm/navigation misses; retain no data afterwards.
    const request = (async () => {
      const response = await fetch(`${config.url}/rest/v1/${path}`, { headers: config.headers, cache: 'no-store' })
      if (!response.ok) throw new Error('Store products unavailable')
      return response.json() as Promise<T>
    })().finally(() => publicReads.delete(key))
    publicReads.set(key, request)
    return request
  }, ['store-public', config.url, revision ?? '', path], { revalidate: 30, tags: [STORE_CATALOGUE_TAG] })()
}

async function readProducts(filters: Record<string, string>, revision: string | null) {
  const query = new URLSearchParams({ select: PRODUCT_SELECT, is_active: 'eq.true', order: 'sort_order,id', ...filters })
  const rows = await publicRead<Parameters<typeof mapProduct>[0][]>(`products?${query}`, revision)
  return rows.map(row => mapProduct(row))
}

function labelProducts(products: StoreCatalogue['products'], categories: StoreCategory[]) {
  return products.map(product => {
    const category = categories.find(item => product.categorySlugs?.includes(item.slug))
    return category ? { ...product, categoryLabel: category.name_ar } : product
  })
}

export const getStoreProducts = cache(async (kind: 'all' | 'ids' | 'slug' | 'category' | 'search', value = ''): Promise<StoreCatalogue> => {
  try {
    const revision = await readStoreRevision()
    const navigationPromise = readNavigation(revision)
    if (!revision) return await navigationPromise
    let filters: Record<string, string> = {}
    if (kind === 'ids') {
      const ids = [...new Set(value.split(',').filter(Boolean))].sort()
      if (!ids.length) return await navigationPromise
      if (ids.length > 100 || ids.some(id => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error('Invalid product IDs')
      filters = { id: `in.(${ids.join(',')})` }
    } else if (kind === 'search') {
      filters = searchFilters(value)
      if (filters.limit === '0') return await navigationPromise
    } else if (kind === 'slug') filters = { slug: `eq.${value}` }
    else if (kind === 'category') {
      // A separate filter relation preserves the complete membership relation.
      filters = { select: `${PRODUCT_SELECT},membership:product_categories!inner(category_slug)`, 'membership.category_slug': `eq.${value}` }
    }
    const [navigation, products] = await Promise.all([navigationPromise, readProducts(filters, revision)])
    return navigation.unavailable ? navigation : { ...navigation, products: labelProducts(products, navigation.categories) }
  } catch { return { ...await readNavigation(null), unavailable: true } }
})

export async function getCategoryProducts(slug: string) {
  const store = await getStoreProducts('category', slug)
  if (store.unavailable) throw new Error('Store products unavailable')
  return store.products
}

export const getStoreHome = cache(async (): Promise<StoreCatalogue> => {
  try {
    const revision = await readStoreRevision()
    const navigationPromise = readNavigation(revision)
    if (!revision) return await navigationPromise
    const selections = await publicRead<{ section: 'hero' | 'bestsellers'; product_id: string; position: number }[]>(
      'home_section_products?select=section,product_id,position&order=section,position', revision)
    const homeSections = { hero: [] as string[], bestsellers: [] as string[] }
    for (const row of selections) if (row.section in homeSections) homeSections[row.section].push(row.product_id)
    const ids = [...new Set([...homeSections.hero, ...homeSections.bestsellers])]
    const [navigation, products] = await Promise.all([navigationPromise, ids.length ? readProducts({ id: `in.(${ids.join(',')})` }, revision) : []])
    return navigation.unavailable ? navigation : { ...navigation, homeSections, products: labelProducts(products, navigation.categories) }
  } catch { return { ...await readNavigation(null), unavailable: true } }
})
