import type { Product, SiteSettings } from './product'

export interface StoreCategory {
  id?: string
  url_slug?: string
  image_path?: string | null
  is_featured?: boolean
  slug: string
  name_ar: string
  parent_slug: string | null
  sort_order: number
  is_active: boolean
  updated_at: string
}

export interface StoreCatalogue {
  products: Product[]
  categories: StoreCategory[]
  settings: SiteSettings
  revision: string | null
  unavailable: boolean
  homeSections?: Record<'hero' | 'bestsellers', string[]>
}
