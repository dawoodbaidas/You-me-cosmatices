'use client'

import { useState, useTransition } from 'react'
import { saveSettings, type ActionResult, type SettingsPayload } from '@/app/admin/actions'
import type { SiteSettings } from '@/types/product'
import { useAdminEditing } from './AdminEditing'

export default function SettingsEditor({ settings }: { settings: SiteSettings }) {
  const editing = useAdminEditing()
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

  const set = (key: keyof SettingsPayload) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
    editing?.setEditing(true)
  }

  return (
    <div className="mt-6 max-w-[720px] space-y-4" dir="rtl">
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

      <Field label="رسوم التوصيل">
        <input
          type="number"
          min="0"
          step="0.001"
          value={draft.store_shipping_fee}
          onChange={(event) => set('store_shipping_fee')(event.target.value)}
        />
      </Field>
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
              const response = await saveSettings(draft)
              setResult(response)
              if (response.ok) editing?.setEditing(false)
            })
          }
          className="rounded-full bg-cocoa px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-rose disabled:opacity-50"
        >
          {pending ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
        </button>
        {result && (
          <span role={result.ok ? 'status' : 'alert'} className={`text-[12px] font-bold ${result.ok ? 'text-sage' : 'text-rose'}`}>
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
