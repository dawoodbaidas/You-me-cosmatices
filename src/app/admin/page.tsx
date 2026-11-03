import StoreBrand from '@/components/StoreBrand'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { signOut } from '@/app/admin/actions'
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

export default async function AdminPage() {
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

  const [productsResult, settingsResult, categoriesResult] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, slug, name_ar, name_en, description, category, category_label, price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order, updated_at, stock_quantity, product_categories(category_slug), product_variants(id, product_id, label, price, is_active, sort_order)',
      )
      .order('sort_order', { ascending: true }),
    supabase.from('site_settings').select('key, value'),
    supabase.from('store_categories').select('*').order('sort_order').order('slug'),
  ])

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

      {productsResult.error || settingsResult.error || categoriesResult.error ? (
        <p role="alert" className="p-8 text-center text-rose">تعذر تحميل لوحة الإدارة. يرجى تحديث الصفحة والمحاولة مجدداً.</p>
      ) : <AdminDashboard products={products} settings={settings} categories={(categoriesResult.data ?? []) as StoreCategory[]} />}
    </main>
  )
}
