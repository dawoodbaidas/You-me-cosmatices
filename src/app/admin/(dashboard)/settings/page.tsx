import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import SettingsEditor from '@/components/admin/SettingsEditor'
import { mapSettings } from '@/lib/products/map'
import { EMPTY_STORE_SETTINGS } from '@/lib/store-catalogue'

export default async function AdminSettingsPage() {
  await requireAdmin()

  const supabase = await createClient()
  const settingsResult = await supabase.from('site_settings').select('key,value')
  const settings = mapSettings(settingsResult.data, EMPTY_STORE_SETTINGS)

  return (
    <div className="space-y-2" dir="rtl">
      <header>
        <h1 className="text-[24px] font-extrabold">الإعدادات</h1>
        <p className="mt-1 text-[12.5px] text-cocoa/60">
          بيانات التواصل والعملة والتوصيل المستخدمة في المتجر.
        </p>
      </header>

      {settingsResult.error ? (
        <p role="alert" className="mt-6 rounded-2xl border border-rose/20 bg-white p-5 text-center text-rose">
          تعذر تحميل الإعدادات. حدّث الصفحة ثم حاولي مجددًا.
        </p>
      ) : (
        <SettingsEditor settings={settings} />
      )}
    </div>
  )
}
