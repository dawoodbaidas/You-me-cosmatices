export type Category = 'packages' | 'mist' | 'skincare' | 'makeup' | 'lips'

/** A category as shown in the storefront filter bar. */
export type CategoryFilter = Category | 'all' | 'skincare-body' | 'bestseller'

export interface ProductVariant {
  /** `productId::label` in the preview snapshot; a real uuid once loaded from Supabase. */
  id: string
  productId?: string
  label: string
  price: number
  isActive?: boolean
  sortOrder?: number
}

export interface Product {
  updatedAt?: string
  /** Database id (uuid). Always use this for cart storage. */
  id: string
  slug: string
  nameAr: string
  nameEn: string
  description: string | null
  category: string
  categoryLabel: string
  price: number
  oldPrice: number | null
  originalPrice?: number
  discountEnabled?: boolean
  isNew?: boolean
  originalImageUrl?: string | null
  processedImageUrl?: string | null
  imageUrl: string | null
  badge: string | null
  benefits: string[]
  isActive?: boolean
  isFeatured?: boolean
  sortOrder?: number
  variants: ProductVariant[]
  categorySlugs?: string[]
  stockQuantity?: number | null
}

/** Cart ids/quantity and the observed price, which is never a checkout authority. */
export interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
  /** Observed at add time, only used to request confirmation; never trusted for pricing. */
  unitPrice?: number
}

/** A cart line joined against the freshly loaded catalogue, with live prices. */
export interface CartLine {
  product: Product
  variant: ProductVariant | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface SiteSettings {
  whatsappNumber: string
  whatsappMessage: string
  email: string
  instagramUrl: string
  facebookUrl: string
  currency: string
  storeTagline: string
  storeAnnouncement: string
  storeFreeShippingThreshold: number
  storeShippingFee?: number
}

export type CatalogueResult =
  | { status: 'ok'; products: Product[]; settings: SiteSettings; source: 'supabase' | 'preview' }
  | { status: 'error'; message: string }
