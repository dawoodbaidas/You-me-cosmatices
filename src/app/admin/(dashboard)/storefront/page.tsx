import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import HomeSectionManager, { type HomeSectionDraft } from '@/components/admin/HomeSectionManager'
import { AdminLink } from '@/components/admin/AdminEditing'
import { mapProduct } from '@/lib/products/map'

const SECTIONS = [
  { key: 'hero', label: 'الهيرو' },
  { key: 'bestsellers', label: 'الأكثر طلبًا' },
] as const

export default async function AdminStorefrontPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  await requireAdmin()

  const params = await searchParams
  const selected = String(params.section ?? '') === 'bestsellers' ? 'bestsellers' : 'hero'

  const supabase = await createClient()
  const sectionsResult = await supabase
    .from('home_sections')
    .select(
      'section,updated_at,home_section_products(position,products(*,product_variants(*),product_categories(category_slug)))',
    )
    .eq('section', selected)

  const sections = (sectionsResult.data ?? []).map((row) => ({
    section: row.section,
    updated_at: row.updated_at,
    products: [...row.home_section_products]
      .sort((a, b) => a.position - b.position)
      .flatMap((entry) =>
        entry.products
          ? [mapProduct(entry.products as unknown as Parameters<typeof mapProduct>[0], true)]
          : [],
      ),
  })) as HomeSectionDraft[]

  return (
    <div className="space-y-2" dir="rtl">
      <header>
        <h1 className="text-[24px] font-extrabold">واجهة المتجر</h1>
        <p className="mt-1 text-[12.5px] text-cocoa/60">
          اختيار وترتيب المنتجات الظاهرة في الصفحة الرئيسية.
        </p>
      </header>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="أقسام واجهة المتجر">
        {SECTIONS.map((item) => {
          const active = item.key === selected
          return (
            <AdminLink
              key={item.key}
              href={`/admin/storefront?section=${item.key}`}
              aria-current={active ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-[12.5px] font-bold transition ${
                active
                  ? 'bg-cocoa text-white'
                  : 'border border-sand bg-white text-cocoa/70 hover:text-cocoa'
              }`}
            >
              {item.label}
            </AdminLink>
          )
        })}
      </nav>

      {sectionsResult.error ? (
        <p role="alert" className="mt-6 rounded-2xl border border-rose/20 bg-white p-5 text-center text-rose">
          تعذر تحميل اختيارات الواجهة. تحقق من تطبيق migration 004 ثم حدّث الصفحة.
        </p>
      ) : sections.length ? (
        sections.map((section) => (
          <HomeSectionManager key={`${section.section}-${section.updated_at}`} section={section} />
        ))
      ) : (
        <p className="mt-6 rounded-2xl border border-sand bg-white p-5 text-center text-cocoa/60">
          لا توجد اختيارات محفوظة لهذا القسم بعد.
        </p>
      )}
    </div>
  )
}
