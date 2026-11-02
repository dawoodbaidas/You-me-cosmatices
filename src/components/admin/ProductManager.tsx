'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/types/product'
import type { ActionResult } from '@/app/admin/actions'
import Toast from '@/components/Toast'
import { formatJod } from '@/lib/format'
import { MAX_UPLOAD_BYTES, validateProduct, type ProductDraft } from '@/lib/products/editor'
import type { StoreCategory } from '@/types/store'

const button = 'rounded-full border border-sand px-4 py-2 text-sm font-bold disabled:opacity-40'
const primary = `${button} bg-cocoa text-white`

export default function ProductManager({ products, categories, currency, onEditingChange }: { products: Product[]; categories: StoreCategory[]; currency: string; onEditingChange: (editing: boolean) => void }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const busy = useRef(false)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [toast, setToast] = useState<React.ComponentProps<typeof Toast>['toast']>(null)
  function notify(response: ActionResult) {
    setResult(response)
    setToast(previous => ({ id: (previous?.id ?? 0) + 1, text: response.message, tone: response.ok ? 'success' : 'error' }))
  }
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  async function remove(product: Product) {
    if (busy.current || !window.confirm(`حذف «${product.nameAr}» وجميع أنواعه نهائياً؟ لا يمكن التراجع عن الحذف.`)) return
    busy.current = true
    setPending(product.id)
    try {
      const response = await fetch(`/api/admin/products?id=${product.id}&version=${encodeURIComponent(product.updatedAt ?? '')}`, { method: 'DELETE' })
      const data = await response.json() as ActionResult
      notify(data)
      if (data.ok) router.refresh()
    } catch { notify({ ok: false, message: 'تعذر الاتصال. حدّثي القائمة للتحقق قبل إعادة المحاولة.' }) }
    finally { busy.current = false; setPending(null) }
  }

  return <section className="mt-6" dir="rtl">
    {editing ? <FullProductEditor key={editing === 'new' ? 'new' : editing.id} categories={categories} product={editing === 'new' ? null : editing}
      onCancel={() => { setEditing(null); onEditingChange(false) }} onSaved={(response) => { notify(response); setEditing(null); onEditingChange(false); router.refresh() }} onError={notify} /> : <>
      <div className="flex flex-wrap gap-3">
        <input aria-label="البحث عن منتج" type="search" placeholder="ابحثي بالاسم أو التصنيف أو الرابط" value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 flex-1 rounded-full border border-sand bg-white px-4 py-2" />
        <button type="button" className={primary} disabled={!!pending} onClick={() => { setResult(null); setEditing('new'); onEditingChange(true) }}>إضافة منتج</button>
      </div>
      <div className="mt-5 grid gap-3">
        {products.filter(p => `${p.nameAr} ${p.nameEn} ${p.categoryLabel} ${p.slug}`.toLowerCase().includes(query.trim().toLowerCase())).map(product => <article key={product.id} className="flex flex-wrap items-center gap-4 rounded-[22px] border border-sand bg-white p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cream">
            {product.imageUrl ? <Image src={product.imageUrl} alt={product.nameAr} fill sizes="80px" className="object-contain" /> : <span className="flex h-full items-center justify-center text-xs">بدون صورة</span>}
          </div>
          <div className="min-w-0 flex-1"><h2 className="font-bold">{product.nameAr}</h2><p className="text-sm text-cocoa/60">{product.categoryLabel} · {formatJod(product.price, currency)}</p><p className="mt-1 text-xs">{product.isActive ? 'نشط' : 'غير نشط'}{product.isFeatured ? ' · مميز' : ''} · الترتيب {product.sortOrder ?? 0} · {product.variants.length} نوع</p></div>
          <div className="flex gap-2"><button type="button" className={button} disabled={!!pending} onClick={() => { setResult(null); setEditing(product); onEditingChange(true) }}>تعديل</button><button type="button" className={`${button} text-rose`} disabled={!!pending} onClick={() => remove(product)}>{pending === product.id ? 'جارٍ الحذف…' : 'حذف'}</button></div>
        </article>)}
        {!products.length && <p className="p-6 text-center">لا توجد منتجات بعد. أضيفي أول منتج.</p>}
        {products.length > 0 && !products.some(p => `${p.nameAr} ${p.nameEn} ${p.categoryLabel} ${p.slug}`.toLowerCase().includes(query.trim().toLowerCase())) && <p className="p-6 text-center">لا توجد نتائج للبحث.</p>}
      </div>
    </>}
    {result && <p role={result.ok ? 'status' : 'alert'} className={`mt-4 text-sm ${result.ok ? 'text-cocoa' : 'text-rose'}`}>{result.message}</p>}
    <Toast toast={toast} />
  </section>
}

function FullProductEditor({ product, categories, onCancel, onSaved, onError }: { product: Product | null; categories: StoreCategory[]; onCancel: () => void; onSaved: (r: ActionResult) => void; onError: (r: ActionResult) => void }) {
  const [id] = useState(() => product?.id ?? crypto.randomUUID())
  const [variants, setVariants] = useState<ProductDraft['variants']>(() => product?.variants.map(v => ({ id: v.id, label: v.label, price: v.price, is_active: v.isActive ?? true, sort_order: v.sortOrder ?? 0 })) ?? [])
  const [categorySlugs, setCategorySlugs] = useState<string[]>(() => product?.categorySlugs ?? [])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(false)
  const [dirty, setDirty] = useState(false)
  const busy = useRef(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview)
  }, [preview])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || pending) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, pending])
  function updateVariant(index: number, patch: Partial<ProductDraft['variants'][number]>) {
    setDirty(true)
    setVariants(current => current.map((v, i) => i === index ? { ...v, ...patch } : v))
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    setError('')
    const form = new FormData(event.currentTarget)
    const text = (key: string) => String(form.get(key) ?? '').trim()
    const draft: ProductDraft = {
      id, updatedAt: product?.updatedAt ?? null, slug: text('slug'), name_ar: text('name_ar'), name_en: text('name_en'),
      description: text('description') || null, category: product?.category ?? categorySlugs[0] ?? '', category_label: categories.find(category => categorySlugs.includes(category.slug))?.name_ar ?? product?.categoryLabel ?? '',
      category_slugs: categorySlugs, stock_quantity: text('stock_quantity') === '' ? null : Number(text('stock_quantity')),
      price: Number(text('price')), old_price: text('old_price') ? Number(text('old_price')) : null,
      badge: text('badge') || null, benefits: text('benefits').split('\n').map(s => s.trim()).filter(Boolean),
      is_active: form.has('is_active'), is_featured: form.has('is_featured'), sort_order: Number(text('sort_order')),
      variants: variants.map(v => ({ ...v, label: v.label.trim() })),
    }
    try { validateProduct(draft) } catch (e) { setError((e as Error).message); return }
    busy.current = true
    setPending(true)
    const body = new FormData()
    body.set('product', JSON.stringify(draft))
    if (file) body.set('image', file)
    try {
      const response = await new Promise<ActionResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/admin/products')
        xhr.timeout = 120_000
        xhr.upload.onprogress = e => setStatus(e.lengthComputable ? `جارٍ إرسال البيانات والصورة… ${Math.round(e.loaded / e.total * 100)}٪` : 'جارٍ إرسال البيانات…')
        xhr.upload.onload = () => setStatus(file ? 'جارٍ تحويل الصورة إلى WebP وحفظ المنتج…' : 'جارٍ حفظ المنتج…')
        xhr.onerror = xhr.ontimeout = () => reject(new Error('تعذر الاتصال. حدّثي القائمة للتحقق من الحفظ قبل إعادة المحاولة.'))
        xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)) } catch { reject(new Error('تعذر إتمام الطلب. حدّثي القائمة للتحقق ثم حاولي مجدداً.')) } }
        setStatus('جارٍ الحفظ…')
        xhr.send(body)
      })
      if (response.ok) { setDirty(false); onSaved(response) }
      else { setError(response.message); onError(response) }
    } catch (e) { const message = (e as Error).message; setError(message); onError({ ok: false, message }) }
    finally { busy.current = false; setPending(false); setStatus('') }
  }
  return <form onSubmit={save} onChange={() => setDirty(true)} className="rounded-[24px] border border-sand bg-white p-4 md:p-6">
    <h2 className="mb-5 text-xl font-extrabold">{product ? `تعديل ${product.nameAr}` : 'إضافة منتج جديد'}</h2>
    <fieldset disabled={pending} className="min-w-0 space-y-5 disabled:opacity-70">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم العربي"><input name="name_ar" required maxLength={250} defaultValue={product?.nameAr} /></Field>
        <Field label="الاسم الإنجليزي"><input name="name_en" dir="ltr" required maxLength={250} defaultValue={product?.nameEn} /></Field>
        <Field label="الرابط المختصر (slug)"><input name="slug" dir="ltr" required maxLength={200} defaultValue={product?.slug} /></Field>
        <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-bold">أقسام المنتج</legend><div className="flex flex-wrap gap-3">{categories.map(category => <label key={category.slug} className="text-sm"><input type="checkbox" checked={categorySlugs.includes(category.slug)} onChange={event => setCategorySlugs(current => event.target.checked ? [...current, category.slug] : current.filter(slug => slug !== category.slug))} /> {category.name_ar}{!category.is_active && ' (مخفي)'}</label>)}</div>{!categories.length && <p className="text-sm">أضف قسماً من تبويب الأقسام أولاً.</p>}</fieldset>
        <Field label="المخزون (فارغ إذا لم يُسجّل)"><input name="stock_quantity" type="number" min="0" max="2147483647" step="1" defaultValue={product?.stockQuantity ?? ''} /></Field>
        <Field label="الشارة"><input name="badge" maxLength={150} defaultValue={product?.badge ?? ''} /></Field>
        <Field label="السعر"><input name="price" type="number" min="0" max="100000" step="0.001" required defaultValue={product?.price ?? 0} /></Field>
        <Field label="السعر القديم (اختياري)"><input name="old_price" type="number" min="0" max="100000" step="0.001" defaultValue={product?.oldPrice ?? ''} /></Field>
        <Field label="الترتيب (الأصغر أولاً)"><input name="sort_order" type="number" min="-2147483647" max="2147483647" step="1" required defaultValue={product?.sortOrder ?? 0} /></Field>
        <div className="flex items-center gap-5"><label><input type="checkbox" name="is_active" defaultChecked={product?.isActive ?? true} /> نشط</label><label><input type="checkbox" name="is_featured" defaultChecked={product?.isFeatured ?? false} /> مميز</label></div>
      </div>
      <Field label="الوصف"><textarea name="description" rows={4} maxLength={10000} defaultValue={product?.description ?? ''} /></Field>
      <Field label="الفوائد (كل فائدة في سطر)"><textarea name="benefits" rows={3} defaultValue={product?.benefits.join('\n') ?? ''} /></Field>
      <div className="rounded-2xl bg-cream p-4">
        <h3 className="mb-3 font-bold">صورة المنتج</h3>
        <div className="relative mb-3 h-48 w-48 max-w-full overflow-hidden rounded-xl bg-white">
          {file && preview ? <Image src={preview} alt="معاينة الصورة الجديدة" fill sizes="192px" unoptimized className="object-contain" /> : product?.imageUrl ? <Image src={product.imageUrl} alt={product.nameAr} fill sizes="192px" className="object-contain" /> : <span className="flex h-full items-center justify-center text-sm">لا توجد صورة</span>}
        </div>
        <label className="block text-sm font-bold">{product?.imageUrl ? 'تغيير الصورة' : 'اختيار صورة'}<input className="mt-2 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff" onChange={e => {
          const selected = e.target.files?.[0]
          if (!selected) return
          if (selected.size > MAX_UPLOAD_BYTES) { setError('حجم الصورة الأقصى 4 MB. اختاري صورة أصغر.'); e.target.value = ''; return }
          setError(''); setFile(selected); setPreview(URL.createObjectURL(selected)); e.target.value = ''
        }} /></label>
        <p className="mt-2 text-xs leading-6 text-cocoa/70">JPG، PNG، WebP، GIF، AVIF أو TIFF · حتى 4 MB. تُحفظ بصيغة WebP بحجم أقصى 1600 بكسل عند الحفظ. الصور المتحركة تُحفظ كصورة ثابتة.</p>
        {file && <button type="button" className={`${button} mt-2`} onClick={() => { setFile(null); setPreview(null) }}>التراجع عن الصورة الجديدة</button>}
      </div>
      <section className="space-y-3 border-t border-sand pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">أنواع المنتج</h3><button type="button" className={button} disabled={variants.length >= 100} onClick={() => { setDirty(true); setVariants(v => [...v, { id: crypto.randomUUID(), label: '', price: product?.price ?? 0, is_active: true, sort_order: v.length }]) }}>إضافة نوع</button></div>
        {!variants.length && <p className="text-sm text-cocoa/60">لا توجد أنواع. سيستخدم المتجر السعر الأساسي.</p>}
        {variants.map((v, index) => <div key={v.id} className="grid items-end gap-3 rounded-2xl border border-sand p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="اسم النوع"><input required maxLength={250} value={v.label} onChange={e => updateVariant(index, { label: e.target.value })} /></Field>
          <Field label="السعر"><input type="number" required min="0" max="100000" step="0.001" value={Number.isNaN(v.price) ? '' : v.price} onChange={e => updateVariant(index, { price: e.target.valueAsNumber })} /></Field>
          <Field label="الترتيب"><input type="number" required min="-2147483647" max="2147483647" step="1" value={Number.isNaN(v.sort_order) ? '' : v.sort_order} onChange={e => updateVariant(index, { sort_order: e.target.valueAsNumber })} /></Field>
          <label className="py-2"><input type="checkbox" checked={v.is_active} onChange={e => updateVariant(index, { is_active: e.target.checked })} /> نشط</label>
          <button type="button" className={`${button} text-rose`} onClick={() => { if (window.confirm(`إزالة النوع «${v.label || 'الجديد'}» عند حفظ المنتج؟`)) { setDirty(true); setVariants(current => current.filter(item => item.id !== v.id)) } }}>حذف النوع</button>
        </div>)}
      </section>
      <div className="flex flex-wrap gap-3"><button type="submit" className={primary}>{pending ? 'جارٍ الحفظ…' : 'حفظ المنتج'}</button><button type="button" className={button} onClick={() => { if (!dirty || window.confirm('تجاهل التعديلات غير المحفوظة؟')) onCancel() }}>إلغاء والعودة</button></div>
    </fieldset>
    {pending && <p role="status" className="mt-4 text-sm">{status}</p>}
    {error && <p role="alert" className="mt-4 text-sm text-rose">{error}</p>}
  </form>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 text-sm"><span className="mb-1 block font-bold text-cocoa/70">{label}</span><span className="block [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-xl [&_input]:border [&_input]:border-sand [&_input]:p-2.5 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-sand [&_textarea]:p-2.5 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-sand [&_select]:p-2.5">{children}</span></label>
}
