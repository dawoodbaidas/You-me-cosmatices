import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import CategoryManager from '@/components/admin/CategoryManager'
import type { StoreCategory } from '@/types/store'

export default async function AdminCategoriesPage() {
  await requireAdmin()

  const supabase = await createClient()
  const [categoriesResult, countsResult] = await Promise.all([
    supabase.from('store_categories').select('*').order('sort_order').order('slug'),
    supabase.rpc('admin_category_counts'),
  ])

  const categories = (categoriesResult.data ?? []) as StoreCategory[]
  const counts = Object.fromEntries(
    (countsResult.data ?? []).map((row: { slug: string; product_count: number }) => [
      row.slug,
      Number(row.product_count),
    ]),
  )

  return (
    <div className="space-y-2" dir="rtl">
      <header>
        <h1 className="text-[24px] font-extrabold">الأقسام</h1>
        <p className="mt-1 text-[12.5px] text-cocoa/60">
          {categories.length} قسم — تنظيم الهيكل والصور والترتيب.
        </p>
      </header>

      {categoriesResult.error || countsResult.error ? (
        <p role="alert" className="mt-6 rounded-2xl border border-rose/20 bg-white p-5 text-center text-rose">
          تعذر تحميل الأقسام. تحقق من تطبيق migration 004 ثم حدّث الصفحة.
        </p>
      ) : (
        <CategoryManager categories={categories} counts={counts} />
      )}
    </div>
  )
}
