import type { Product, ProductVariant, SiteSettings } from '@/types/product'

export const FALLBACK_SETTINGS: SiteSettings = {
  whatsappNumber: '962777260622',
  whatsappMessage: 'مرحباً You&Me 💘\nأرغب بطلب المنتجات التالية:',
  email: 'youme.work20@gmail.com',
  instagramUrl: '',
  facebookUrl: '',
  currency: 'JOD',
  storeTagline: 'لأن جمالك قصة، ونحن نهتم بتفاصيلها.',
  storeAnnouncement: 'توصيل سريع في الأردن • دفع عند الاستلام',
  storeFreeShippingThreshold: 25,
}

/** `site_settings.key` → the `SiteSettings` field it feeds. */
const SETTING_FIELDS = [
  ['whatsapp_number', 'whatsappNumber'],
  ['whatsapp_message', 'whatsappMessage'],
  ['email', 'email'],
  ['instagram_url', 'instagramUrl'],
  ['facebook_url', 'facebookUrl'],
  ['currency', 'currency'],
  ['store_tagline', 'storeTagline'],
  ['store_announcement', 'storeAnnouncement'],
  ['store_free_shipping_threshold', 'storeFreeShippingThreshold'],
  ['store_shipping_fee', 'storeShippingFee'],
] as const satisfies readonly (readonly [string, keyof SiteSettings])[]

/**
 * Product rows exactly as they come back from PostgREST.
 * `price`/`old_price` are `numeric`, which PostgREST returns as a string.
 */
interface ProductRow {
  id: string
  slug: string
  name_ar: string
  name_en: string
  description: string | null
  category: Product['category']
  category_label: string
  price: number | string
  old_price: number | string | null
  original_price?: number | string
  discount_enabled?: boolean
  is_new?: boolean
  image_url: string | null
  original_image_url?: string | null
  processed_image_url?: string | null
  badge: string | null
  benefits: unknown
  is_active: boolean
  is_featured: boolean
  sort_order: number
  updated_at?: string
  product_variants?: VariantRow[] | null
  stock_quantity?: number | null
  product_categories?: { category_slug: string }[] | null
}

interface VariantRow {
  id: string
  product_id: string
  label: string
  price: number | string
  is_active: boolean
  sort_order: number
}

const toNumber = (value: number | string | null): number => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0
}

const toBenefits = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

export function mapVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    label: row.label,
    price: toNumber(row.price),
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }
}

export function mapProduct(row: ProductRow, includeInactiveVariants = false): Product {
  const variants = (row.product_variants ?? [])
    .filter((variant) => includeInactiveVariants || variant.is_active)
    .map(mapVariant)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  return {
    id: row.id,
    updatedAt: row.updated_at,
    slug: row.slug,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    description: row.description,
    category: row.category,
    categoryLabel: row.category_label,
    price: toNumber(row.price),
    oldPrice: row.old_price === null ? null : toNumber(row.old_price),
    originalPrice: toNumber(row.original_price ?? row.old_price ?? row.price),
    discountEnabled: row.discount_enabled ?? (row.old_price != null && toNumber(row.old_price) > toNumber(row.price)),
    isNew: row.is_new ?? /^(new|جديد)$/i.test(row.badge?.trim() ?? ''),
    originalImageUrl: row.original_image_url as string | null,
    processedImageUrl: row.processed_image_url as string | null,
    imageUrl: row.image_url,
    badge: row.badge,
    benefits: toBenefits(row.benefits),
    isActive: row.is_active,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    variants,
    stockQuantity: row.stock_quantity ?? null,
    categorySlugs: row.product_categories?.map(category => category.category_slug) ?? [],
  }
}

export function mapSettings(rows: { key: string; value: string }[] | null, defaults = FALLBACK_SETTINGS): SiteSettings {
  const stored = new Map((rows ?? []).map((row) => [row.key, row.value]))
  const settings = { ...defaults }

  for (const [dbKey, field] of SETTING_FIELDS) {
    const value = stored.get(dbKey)
    if (value === undefined) continue

    if (field === 'storeFreeShippingThreshold' || field === 'storeShippingFee') {
      const parsed = Number.parseFloat(value)
      if (Number.isFinite(parsed)) settings[field] = parsed
      continue
    }

    // Every remaining field is a string on SiteSettings.
    Object.assign(settings, { [field]: value })
  }

  return settings
}
