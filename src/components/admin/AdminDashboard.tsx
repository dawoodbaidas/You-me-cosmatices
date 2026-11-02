'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import {
  saveProductPrices,
  saveSettings,
  setProductFlags,
  type ActionResult,
  type SettingsPayload,
} from '@/app/admin/actions'
import { formatJod } from '@/lib/format'
import type { Product, SiteSettings } from '@/types/product'
import ProductManager from '@/components/admin/ProductManager'
import CategoryManager from './CategoryManager'
import type { StoreCategory } from '@/types/store'

type Tab = 'products' | 'prices' | 'settings' | 'categories'

export default function AdminDashboard({
  products,
  settings,
  categories,
}: {
  products: Product[]
  settings: SiteSettings
  categories: StoreCategory[]
}) {
  const [tab, setTab] = useState<Tab>('products')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return products
    return products.filter((product) =>
      `${product.nameAr} ${product.nameEn} ${product.slug}`.toLowerCase().includes(needle),
    )
  }, [products, query])

  const variantCount = useMemo(
    () => products.reduce((sum, product) => sum + product.variants.length, 0),
    [products],
  )

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold">إدارة المنتجات والمتجر</h1>
          <p className="mt-1 text-[12.5px] text-cocoa/60">
            {products.length} منتج • {variantCount} نوع — اضغطي حفظ لتطبيق التعديلات في المتجر.
          </p>
        </div>

        <div className="flex gap-1 rounded-full border border-sand bg-white p-1">
          {(
            [
              ['products', 'المنتجات'],
              ['prices', 'الأسعار'],
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

      {tab === 'products' ? <ProductManager products={products} categories={categories} currency={settings.currency} onEditingChange={setEditing} /> : tab === 'categories' ? <CategoryManager categories={categories} onEditingChange={setEditing} /> : tab === 'prices' ? (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحثي باسم المنتج…"
            className="mt-6 w-full rounded-full border border-sand bg-white px-4 py-2.5 text-[13px] outline-none focus:border-rose md:max-w-sm"
          />

          <div className="mt-5 space-y-4">
            {visible.map((product) => (
              <ProductEditor key={`${product.id}-${product.updatedAt}`} product={product} currency={settings.currency} />
            ))}
          </div>
        </>
      ) : (
        <SettingsEditor settings={settings} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ product card */

function ProductEditor({ product, currency }: { product: Product; currency: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)

  // Local drafts keep typing smooth; nothing is written until "حفظ".
  const [price, setPrice] = useState(String(product.price))
  const [oldPrice, setOldPrice] = useState(
    product.oldPrice === null ? '' : String(product.oldPrice),
  )
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.variants.map((variant) => [variant.id, String(variant.price)])),
  )

  const parsedPrice = Number.parseFloat(price)
  const parsedOldPrice = oldPrice.trim() === '' ? null : Number.parseFloat(oldPrice)
  const parsedVariants = Object.fromEntries(
    Object.entries(variantPrices).map(([id, value]) => [id, Number.parseFloat(value)]),
  )

  const dirty =
    parsedPrice !== product.price ||
    (parsedOldPrice ?? null) !== (product.oldPrice ?? null) ||
    product.variants.some(
      (variant) => Number.parseFloat(variantPrices[variant.id] ?? '') !== variant.price,
    )

  const invalid =
    !Number.isFinite(parsedPrice) ||
    parsedPrice < 0 ||
    (parsedOldPrice !== null &&
      (!Number.isFinite(parsedOldPrice) || parsedOldPrice < parsedPrice)) ||
    Object.values(parsedVariants).some((value) => !Number.isFinite(value) || value < 0)

  return (
    <article
      data-testid={`admin-product-${product.slug}`}
      className="rounded-[22px] border border-sand bg-white p-4 shadow-[0_8px_30px_rgba(74,46,42,0.04)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="text-[11px] font-bold tracking-widest text-[#B78A4E]">
            {product.categoryLabel}
          </div>
          <h2 className="mt-0.5 text-[15px] font-bold">{product.nameAr}</h2>
          <div className="text-[11.5px] text-cocoa/50">{product.nameEn}</div>
          <div className="mt-1 font-mono text-[10.5px] text-cocoa/35">{product.slug}</div>
        </div>

        <div className="flex items-center gap-2">
          <Toggle
            disabled={pending || dirty}
            label="مفعّل"
            active={product.isActive ?? true}
            onChange={(value) =>
              startTransition(async () => {
                setResult(await setProductFlags(product.id, { is_active: value }))
                router.refresh()
              })
            }
          />
          <Toggle
            disabled={pending || dirty}
            label="مميّز"
            active={product.isFeatured ?? false}
            onChange={(value) =>
              startTransition(async () => {
                setResult(await setProductFlags(product.id, { is_featured: value }))
                router.refresh()
              })
            }
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-cocoa/60">السعر الحالي</span>
          <input
            type="number"
            step="0.25"
            min="0"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-[130px] rounded-full border border-sand bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-rose"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-cocoa/60">
            السعر القديم (فارغ = بدون خصم)
          </span>
          <input
            type="number"
            step="0.25"
            min="0"
            value={oldPrice}
            onChange={(event) => setOldPrice(event.target.value)}
            className="w-[130px] rounded-full border border-sand bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-rose"
          />
        </label>

        <span className="pb-2 text-[12px] text-cocoa/50">
          المعروض في المتجر:{' '}
          <b className="text-cocoa">{formatJod(parsedPrice || 0, currency)}</b>
        </span>
      </div>

      {product.variants.length > 0 && (
        <div className="mt-4 border-t border-sand pt-4">
          <div className="mb-2 text-[11px] font-bold tracking-widest text-cocoa/60">أسعار الأنواع</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {product.variants.map((variant) => (
              <label key={variant.id} className="flex items-center gap-2">
                <span className="min-w-[96px] flex-1 truncate text-[11.5px] font-medium text-cocoa/70">
                  {variant.label}
                </span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={variantPrices[variant.id] ?? ''}
                  onChange={(event) =>
                    setVariantPrices((current) => ({
                      ...current,
                      [variant.id]: event.target.value,
                    }))
                  }
                  className="w-[96px] rounded-full border border-sand bg-white px-3 py-1.5 text-[12px] font-bold outline-none focus:border-rose"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !dirty || invalid}
          onClick={() =>
            startTransition(async () => {
              const response = await saveProductPrices({
                productId: product.id,
                updatedAt: product.updatedAt ?? '',
                price: parsedPrice,
                oldPrice: parsedOldPrice,
                variantPrices: parsedVariants,
              })
              setResult(response)
              if (response.ok) router.refresh()
            })
          }
          className="rounded-full bg-cocoa px-5 py-2 text-[12.5px] font-bold text-white transition hover:bg-rose disabled:opacity-40"
        >
          {pending ? 'جارٍ الحفظ…' : 'حفظ الأسعار'}
        </button>

        {result && (
          <span className={`text-[12px] font-bold ${result.ok ? 'text-sage' : 'text-rose'}`}>
            {result.message}
          </span>
        )}

        {invalid && (
          <span className="text-[12px] font-bold text-rose">
            راجعي القيم: السعر القديم يجب أن يكون أكبر من السعر الحالي.
          </span>
        )}
      </div>
    </article>
  )
}

/* ----------------------------------------------------------------- toggles */

function Toggle({
  disabled,
  label,
  active,
  onChange,
}: {
  disabled: boolean
  label: string
  active: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!active)}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition ${
        active ? 'border-sage/40 bg-[#E8F5E0] text-[#5A8A4A]' : 'border-sand bg-white text-cocoa/50'
      }`}
    >
      {label}
    </button>
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
