import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  await requireAdmin()

  const params = await searchParams
  const legacyQuery = String(params.q ?? '').trim()
  if (legacyQuery || params.page) {
    const search = new URLSearchParams()
    if (legacyQuery) search.set('q', legacyQuery)
    if (params.page) search.set('page', params.page)
    redirect(`/admin/products?${search.toString()}`)
  }

  const supabase = await createClient()
  const [totalResult, activeResult, unavailableResult, categoriesResult] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .or('is_out_of_stock.eq.true,stock_quantity.eq.0'),
    supabase.from('store_categories').select('slug', { count: 'exact', head: true }),
  ])

  const failed = [totalResult, activeResult, unavailableResult, categoriesResult].some(
    (result) => result.error,
  )
  const total = totalResult.count ?? 0
  const active = activeResult.count ?? 0
  const unavailable = unavailableResult.count ?? 0
  const categories = categoriesResult.count ?? 0

  return (
    <div className="space-y-8" dir="rtl">
      <header>
        <h1 className="text-[24px] font-extrabold">الرئيسية</h1>
        <p className="mt-1 text-[12.5px] text-cocoa/60">
          نظرة سريعة على المتجر وإدارة أقسامه.
        </p>
      </header>

      {failed ? (
        <p role="alert" className="rounded-2xl border border-rose/20 bg-white p-5 text-center text-rose">
          تعذر تحميل إحصاءات اللوحة. تحقق من تطبيق migrations ثم حدّث الصفحة.
        </p>
      ) : (
        <section aria-label="إحصاءات المتجر" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="إجمالي المنتجات" value={total} hint={`${active} نشط · ${Math.max(0, total - active)} غير منشور`} />
          <Stat label="المنتجات النشطة" value={active} hint="ظاهرة في المتجر" />
          <Stat label="نفد من المخزون" value={unavailable} hint="إيقاف يدوي أو كمية صفر" />
          <Stat label="الأقسام" value={categories} hint="رئيسية وفرعية" />
        </section>
      )}

      <section aria-label="أقسام الإدارة" className="grid gap-4 md:grid-cols-2">
        <SectionLink href="/admin/products" title="المنتجات" description="الأسعار والصور والأنواع والمخزون والبحث." />
        <SectionLink href="/admin/categories" title="الأقسام" description="إنشاء الأقسام وترتيبها وصورها والهيكل الهرمي." />
        <SectionLink href="/admin/storefront" title="واجهة المتجر" description="اختيار وترتيب منتجات الهيرو والأكثر طلبًا." />
        <SectionLink href="/admin/settings" title="الإعدادات" description="بيانات التواصل والعملة والتوصيل." />
      </section>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <article className="rounded-2xl border border-sand bg-white p-5">
      <p className="text-[12px] font-bold text-cocoa/60">{label}</p>
      <p className="mt-2 text-[28px] font-extrabold leading-none">{value}</p>
      <p className="mt-2 text-[11.5px] text-cocoa/55">{hint}</p>
    </article>
  )
}

function SectionLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-sand bg-white p-5 transition hover:border-rose/40 hover:bg-blush/40"
    >
      <h2 className="text-[16px] font-extrabold">{title}</h2>
      <p className="mt-1 text-[12.5px] leading-5 text-cocoa/60">{description}</p>
    </Link>
  )
}
