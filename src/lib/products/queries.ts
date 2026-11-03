import { getStoreCatalogue } from '@/lib/store-catalogue'
import { FALLBACK_SETTINGS } from '@/lib/products/map'
import type { CatalogueResult, Product } from '@/types/product'

/** Shape emitted by the preview snapshot (`npm run seed:build`). */
interface PreviewProduct {
  slug: string
  nameAr: string
  nameEn: string
  description: string | null
  category: Product['category']
  categoryLabel: string
  price: number
  oldPrice: number | null
  imageUrl: string | null
  badge: string | null
  benefits: string[]
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  variants: { id: string; label: string; price: number; isActive: boolean; sortOrder: number }[]
}

/**
 * Only loaded when Supabase is intentionally absent, because the dynamic
 * `import()` below keeps the snapshot out of the normal request path.
 */
async function loadPreviewSnapshot(): Promise<PreviewProduct[]> {
  const loaded = await import('@/data/preview-products.json')
  return loaded.default as PreviewProduct[]
}

function previewEnabled() {
  return process.env.PREVIEW_WITHOUT_SUPABASE === 'true'
}

/**
 * Loads the storefront catalogue.
 *
 * Supabase is the source of truth. When it is unreachable the caller gets a
 * `status: 'error'` result so the page can render a friendly message instead of
 * silently showing stale prices. `PREVIEW_WITHOUT_SUPABASE=true` opts into a
 * local, offline design preview using the generated snapshot — it is ignored as
 * soon as Supabase credentials exist.
 */
export async function getCatalogue(): Promise<CatalogueResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    if (previewEnabled()) return previewCatalogue()
    return {
      status: 'error',
      message:
        'لم يتم ربط Supabase بعد. أضف NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في ملف .env.local ثم أعد تشغيل الخادم.',
    }
  }

  const store = await getStoreCatalogue()
  return store.unavailable ? { status: 'error', message: 'Catalogue unavailable' } : {
    status: 'ok', products: store.products, settings: store.settings, source: 'supabase',
  }
}

async function previewCatalogue(): Promise<CatalogueResult> {
  try {
    const snapshot = await loadPreviewSnapshot()

    const products: Product[] = snapshot.map((entry) => ({
      id: entry.slug,
      slug: entry.slug,
      nameAr: entry.nameAr,
      nameEn: entry.nameEn,
      description: entry.description,
      category: entry.category,
      categoryLabel: entry.categoryLabel,
      price: entry.price,
      oldPrice: entry.oldPrice,
      imageUrl: entry.imageUrl,
      badge: entry.badge,
      benefits: entry.benefits,
      isActive: entry.isActive,
      isFeatured: entry.isFeatured,
      sortOrder: entry.sortOrder,
      variants: entry.variants.map((variant) => ({ ...variant, productId: entry.slug })),
    }))

    return { status: 'ok', products, settings: FALLBACK_SETTINGS, source: 'preview' }
  } catch {
    return {
      status: 'error',
      message: 'ملف المعاينة غير موجود. شغّل: npm run seed:build',
    }
  }
}
