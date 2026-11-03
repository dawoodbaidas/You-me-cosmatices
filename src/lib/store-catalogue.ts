import { cache } from 'react'
import { mapProduct, mapSettings } from './products/map'
import type { StoreCatalogue, StoreCategory } from '@/types/store'
import type { SiteSettings } from '@/types/product'

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
export async function readStoreRevision(): Promise<string | null> {
  const config = publicDatabaseConfig()
  if (!config) return null
  const response = await fetch(`${config.url}/rest/v1/store_revision?id=eq.1&select=version`, { headers: config.headers, cache: 'no-store' })
  if (!response.ok) throw new Error('Store revision unavailable')
  const rows = await response.json() as { version: number | string }[]
  if (!rows[0]) throw new Error('Store revision missing')
  return String(rows[0].version)
}

export async function readStoreCatalogue(fresh = false): Promise<StoreCatalogue> {
  const empty: StoreCatalogue = { products: [], categories: [], settings: EMPTY_STORE_SETTINGS, revision: null, unavailable: false }
  const config = publicDatabaseConfig()
  if (!config) return empty
  try {
    const revision = await readStoreRevision()
    const response = await fetch(`${config.url}/rest/v1/rpc/get_store_catalogue?p_revision=${encodeURIComponent(revision!)}`, {
      headers: config.headers, ...(fresh ? { cache: 'no-store' as const } : { cache: 'force-cache' as const, next: { revalidate: 300, tags: [STORE_CATALOGUE_TAG] } }),
    })
    if (!response.ok) throw new Error('Store catalogue unavailable')
    const data = await response.json() as {
      products: Parameters<typeof mapProduct>[0][]; categories: StoreCategory[]
      settings: { key: string; value: string }[]; revision: number | string
    }
    return {
      products: data.products.map(row => {
        const product = mapProduct(row)
        const category = data.categories.find(category => product.categorySlugs?.includes(category.slug))
        return category ? { ...product, categoryLabel: category.name_ar } : product
      }), categories: data.categories,
      settings: mapSettings(data.settings, EMPTY_STORE_SETTINGS), revision: String(data.revision), unavailable: false,
    }
  } catch {
    // No demo catalogue, inferred departments, replacement images or invented prices.
    return { ...empty, unavailable: true }
  }
}

export const getStoreCatalogue = cache(() => readStoreCatalogue())
