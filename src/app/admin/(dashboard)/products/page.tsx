import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import ProductManager from '@/components/admin/ProductManager'
import type { Product, SiteSettings } from '@/types/product'
import type { StoreCategory } from '@/types/store'
import { mapProduct, mapSettings } from '@/lib/products/map'
import { EMPTY_STORE_SETTINGS } from '@/lib/store-catalogue'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string; availability?: string }>
}) {
  await requireAdmin()

  const params = await searchParams
  const query = String(params.q ?? '')
    .slice(0, 150)
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.page) || 1)))

  const category = String(params.category ?? '').slice(0, 200)
  const availability = ['available', 'unavailable', 'hidden'].includes(params.availability ?? '') ? params.availability! : ''
  const supabase = await createClient()
  let request = supabase
    .from('products')
    .select(category ? '*,product_categories(category_slug),product_variants(*),category_filter:product_categories!inner(category_slug)' : '*,product_categories(category_slug),product_variants(*)', { count: 'exact' })
    .order('sort_order')
    .order('id')
    .range((page - 1) * 30, page * 30 - 1)
  if (category) request = request.eq('category_filter.category_slug', category)
  if (availability === 'available') request = request.eq('is_active', true).eq('is_out_of_stock', false).or('stock_quantity.is.null,stock_quantity.gt.0')
  if (availability === 'unavailable') request = request.or('is_out_of_stock.eq.true,stock_quantity.eq.0')
  if (availability === 'hidden') request = request.eq('is_active', false)
  if (query) {
    request = request.or(
      `name_ar.ilike.%${query}%,name_en.ilike.%${query}%,slug.ilike.%${query}%`,
    )
  }

  const [productsResult, categoriesResult, settingsResult] = await Promise.all([
    request,
    supabase.from('store_categories').select('*').order('sort_order').order('slug'),
    supabase.from('site_settings').select('key,value'),
  ])

  const products: Product[] = (productsResult.data ?? []).map((row) =>
    mapProduct(row as unknown as Parameters<typeof mapProduct>[0], true),
  )
  const settings: SiteSettings = mapSettings(settingsResult.data, EMPTY_STORE_SETTINGS)
  const total = productsResult.count ?? 0

  return (
    <div className="space-y-2" dir="rtl">
      <header>
        <h1 className="text-[24px] font-extrabold">المنتجات</h1>
        <p className="mt-1 text-[12.5px] text-cocoa/60">
          {total} منتج — اضغطي حفظ لتطبيق التعديلات في المتجر.
        </p>
      </header>

      {productsResult.error || categoriesResult.error || settingsResult.error ? (
        <p role="alert" className="mt-6 rounded-2xl border border-rose/20 bg-white p-5 text-center text-rose">
          تعذر تحميل المنتجات. تحقق من تطبيق migration 004 ثم حدّث الصفحة.
        </p>
      ) : (
        <ProductManager
          key={[query, category, availability, page].join(':')}
          initialCategory={category}
          initialAvailability={availability}
          products={products}
          total={total}
          page={page}
          initialQuery={query}
          categories={(categoriesResult.data ?? []) as StoreCategory[]}
          currency={settings.currency}
        />
      )}
    </div>
  )
}
