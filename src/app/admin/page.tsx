import StoreBrand from '@/components/StoreBrand'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { signOut } from '@/app/admin/actions'
import type { HomeSectionDraft } from '@/components/admin/HomeSectionManager'
import AdminDashboard from '@/components/admin/AdminDashboard'
import type { Product, SiteSettings } from '@/types/product'
import type { StoreCategory } from '@/types/store'
import { mapProduct, mapSettings } from '@/lib/products/map'
import { EMPTY_STORE_SETTINGS } from '@/lib/store-catalogue'

export const metadata = {
  title: 'لوحة المسؤول | You&Me Cosmetics',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams
  const query = String(params.q ?? '').slice(0,150).replace(/[^\p{L}\p{N}\s-]/gu,' ').trim()
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.page) || 1)))
  if (!isSupabaseConfigured()) redirect('/admin/login')

  const { user, admin } = await getViewer()

  if (!user) redirect('/admin/login')

  if (!admin) {
    // Authenticated but not authorised — RLS would reject writes anyway.
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-[460px] rounded-[24px] border border-sand bg-white p-7 text-center">
          <h1 className="text-[18px] font-extrabold">هذا الحساب ليس حساب مسؤول</h1>
          <p className="mt-3 text-[13px] leading-6 text-cocoa/70">
            سجّلتِ الدخول كـ {user.email}، لكن البريد غير مُدرج في جدول{' '}
            <code className="ltr">admin_emails</code> ولا يحمل{' '}
            <code className="ltr">app_metadata.role = admin</code>. اسألي صاحب المتجر لإضافتك.
          </p>
          <form action={signOut} className="mt-6">
            <button
              type="submit"
              className="rounded-full bg-cocoa px-6 py-2.5 text-[13px] font-bold text-white"
            >
              تسجيل الخروج
            </button>
          </form>
        </div>
      </main>
    )
  }

  const supabase = await createClient()

  let request = supabase.from('products').select('*,product_categories(category_slug),product_variants(*)', { count: 'exact' }).order('sort_order').order('id').range((page-1)*30,page*30-1)
  if (query) request=request.or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%,slug.ilike.%${query}%`)
  const [productsResult, settingsResult, categoriesResult, sectionsResult, countsResult] = await Promise.all([
    request, supabase.from('site_settings').select('key,value'),
    supabase.from('store_categories').select('*').order('sort_order').order('slug'),
    supabase.from('home_sections').select('section,updated_at,home_section_products(position,products(*,product_variants(*),product_categories(category_slug)))'),
    supabase.rpc('admin_category_counts'),
  ])
  const sections = (sectionsResult.data ?? []).map(row => ({ section: row.section, updated_at: row.updated_at, products: [...row.home_section_products].sort((a,b)=>a.position-b.position).flatMap(entry => entry.products ? [mapProduct(entry.products as unknown as Parameters<typeof mapProduct>[0],true)] : []) })) as HomeSectionDraft[]
  const categoryCounts = Object.fromEntries((countsResult.data ?? []).map((row: {slug:string;product_count:number})=>[row.slug,Number(row.product_count)]))

  const products: Product[] = (productsResult.data ?? []).map((row) =>
    mapProduct(row as Parameters<typeof mapProduct>[0], true),
  )
  const settings: SiteSettings = mapSettings(settingsResult.data, EMPTY_STORE_SETTINGS)

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-sand bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <StoreBrand size="compact" />
            <span className="text-[15px] font-extrabold text-cocoa">لوحة المسؤول</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] text-cocoa/60 sm:inline">
              <span className="ltr">{user.email}</span>
            </span>
            <Link
              href="/"
              className="rounded-full border border-sand bg-white px-4 py-2 text-[12.5px] font-bold text-cocoa"
            >
              عرض المتجر
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full bg-cocoa px-4 py-2 text-[12.5px] font-bold text-white"
              >
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>

      {productsResult.error || settingsResult.error || categoriesResult.error || sectionsResult.error || countsResult.error ? (
        <p role="alert" className="p-8 text-center text-rose">تعذر تحميل لوحة الإدارة. تحقق من تطبيق migration 004 ثم حدّث الصفحة.</p>
      ) : <AdminDashboard sections={sections} categoryCounts={categoryCounts} total={productsResult.count ?? 0} page={page} query={query} products={products} settings={settings} categories={(categoriesResult.data ?? []) as StoreCategory[]} />}
    </main>
  )
}
