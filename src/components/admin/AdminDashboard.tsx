'use client'

import { useState, useTransition } from 'react'
import {
  saveSettings,
  type ActionResult,
  type SettingsPayload,
} from '@/app/admin/actions'
import HomeSectionManager, { type HomeSectionDraft } from './HomeSectionManager'
import type { Product, SiteSettings } from '@/types/product'
import ProductManager from '@/components/admin/ProductManager'
import CategoryManager from './CategoryManager'
import type { StoreCategory } from '@/types/store'

type Tab = 'products' | 'home' | 'settings' | 'categories'

export default function AdminDashboard({
  products,
  settings,
  categories, total, page, query, sections, categoryCounts,
}: {
  total: number; page: number; query: string; sections: HomeSectionDraft[]; categoryCounts: Record<string,number>
  products: Product[]
  settings: SiteSettings
  categories: StoreCategory[]
}) {
  const [tab, setTab] = useState<Tab>('products')
  const [homeTab, setHomeTab] = useState<'hero' | 'bestsellers'>('hero')
  const [editing, setEditing] = useState(false)

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold">إدارة المنتجات والمتجر</h1>
          <p className="mt-1 text-[12.5px] text-cocoa/60">
            {total} منتج — اضغطي حفظ لتطبيق التعديلات في المتجر.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-2xl border border-sand bg-white p-1">
          {(
            [
              ['products', 'المنتجات'],
              ['home', 'إدارة الصفحة الرئيسية'],
              ['categories', 'الأقسام'],
              ['settings', 'الإعدادات'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              disabled={editing && key !== tab}
              aria-pressed={tab === key}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-bold transition disabled:opacity-40 ${
                tab === key ? 'bg-cocoa text-white' : 'text-cocoa/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'products' ? <ProductManager products={products} total={total} page={page} initialQuery={query} categories={categories} currency={settings.currency} onEditingChange={setEditing} /> : tab === 'categories' ? <CategoryManager categories={categories} counts={categoryCounts} onEditingChange={setEditing} /> : tab === 'home' ? <section>
        <h2 className="mt-6 text-xl font-bold">إدارة الصفحة الرئيسية</h2>
        <div className="mt-4 flex gap-3">{(['hero','bestsellers'] as const).map(key => <button key={key} disabled={editing && key !== homeTab} aria-pressed={key === homeTab} className="rounded-full border border-sand px-4 py-2 disabled:opacity-40" onClick={() => setHomeTab(key)}>{key === 'hero' ? 'إدارة الهيرو' : 'إدارة الأكثر طلبًا'}</button>)}</div>
        {sections.filter(section=>section.section===homeTab).map(section=><HomeSectionManager key={section.section+'-'+section.updated_at} section={section} onEditingChange={setEditing} />)}
      </section> : (
        <SettingsEditor settings={settings} />
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- settings */

function SettingsEditor({ settings }: { settings: SiteSettings }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [draft, setDraft] = useState<SettingsPayload>({
    whatsapp_number: settings.whatsappNumber,
    whatsapp_message: settings.whatsappMessage,
    email: settings.email,
    instagram_url: settings.instagramUrl,
    facebook_url: settings.facebookUrl,
    currency: settings.currency,
    store_tagline: settings.storeTagline,
    store_announcement: settings.storeAnnouncement,
    store_free_shipping_threshold: String(settings.storeFreeShippingThreshold),
    store_shipping_fee: String(settings.storeShippingFee ?? 0),
  })

  const set = (key: keyof SettingsPayload) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <div className="mt-6 max-w-[720px] space-y-4">
      <Field label="رقم واتساب (أرقام فقط مع رمز الدولة)">
        <input dir="ltr" value={draft.whatsapp_number} onChange={(e) => set('whatsapp_number')(e.target.value)} />
      </Field>

      <Field label="نص بداية رسالة الطلب">
        <textarea
          rows={2}
          value={draft.whatsapp_message}
          onChange={(e) => set('whatsapp_message')(e.target.value)}
        />
      </Field>

      <Field label="البريد الإلكتروني">
        <input dir="ltr" type="email" value={draft.email} onChange={(e) => set('email')(e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رابط إنستغرام">
          <input
            dir="ltr"
            placeholder="https://instagram.com/…"
            value={draft.instagram_url}
            onChange={(e) => set('instagram_url')(e.target.value)}
          />
        </Field>
        <Field label="رابط فيسبوك">
          <input
            dir="ltr"
            placeholder="https://facebook.com/…"
            value={draft.facebook_url}
            onChange={(e) => set('facebook_url')(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="العملة">
          <input value={draft.currency} onChange={(e) => set('currency')(e.target.value)} />
        </Field>
        <Field label="حد التوصيل المجاني (0 لإلغائه)">
          <input
            type="number"
            step="0.5"
            min="0"
            value={draft.store_free_shipping_threshold}
            onChange={(e) => set('store_free_shipping_threshold')(e.target.value)}
          />
        </Field>
      </div>

      <Field label="رسوم التوصيل"><input type="number" min="0" step="0.001" value={draft.store_shipping_fee} onChange={event => set('store_shipping_fee')(event.target.value)} /></Field>
      <Field label="جملة التعريف">
        <input value={draft.store_tagline} onChange={(e) => set('store_tagline')(e.target.value)} />
      </Field>

      <Field label="الشريط التعريفي">
        <input
          value={draft.store_announcement}
          onChange={(e) => set('store_announcement')(e.target.value)}
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setResult(await saveSettings(draft))
            })
          }
          className="rounded-full bg-cocoa px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-rose disabled:opacity-50"
        >
          {pending ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
        </button>
        {result && (
          <span className={`text-[12px] font-bold ${result.ok ? 'text-sage' : 'text-rose'}`}>
            {result.message}
          </span>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-bold text-cocoa/70">{label}</span>
      <div className="[&_input]:w-full [&_input]:rounded-full [&_input]:border [&_input]:border-sand [&_input]:bg-white [&_input]:px-4 [&_input]:py-2.5 [&_input]:text-[13px] [&_input]:outline-none [&_input]:focus:border-rose [&_textarea]:w-full [&_textarea]:rounded-[18px] [&_textarea]:border [&_textarea]:border-sand [&_textarea]:bg-white [&_textarea]:px-4 [&_textarea]:py-2.5 [&_textarea]:text-[13px] [&_textarea]:outline-none [&_textarea]:focus:border-rose">
        {children}
      </div>
    </label>
  )
}
