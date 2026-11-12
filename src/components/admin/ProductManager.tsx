'use client'

import { adminCategoryLabel } from '@/lib/admin-categories'
import Image from 'next/image'
import Link from 'next/link'
import { moveProducts, setProductAvailability } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/types/product'
import type { ActionResult } from '@/app/admin/actions'
import Toast from '@/components/Toast'
import { formatJod } from '@/lib/format'
import { validateProduct, type ProductDraft } from '@/lib/products/editor'
import type { StoreCategory } from '@/types/store'
import ProductImageEditor, { type ProductImageChoice } from './ProductImageEditor'
import { isProductOutOfStock } from '@/lib/cart'
import StockBadge from '@/components/StockBadge'
import { useAdminEditing } from './AdminEditing'

const button = 'rounded-full border border-sand px-4 py-2 text-sm font-bold disabled:opacity-40'
const primary = `${button} bg-cocoa text-white`

export default function ProductManager({ products, total, page, initialQuery, initialCategory = '', initialAvailability = '', categories, currency, onEditingChange }: { total: number; page: number; initialQuery: string; initialCategory?: string; initialAvailability?: string; products: Product[]; categories: StoreCategory[]; currency: string; onEditingChange?: (editing: boolean) => void }) {
  const productPage = (next: number) => '/admin/products?' + new URLSearchParams({ q: initialQuery, category: initialCategory, availability: initialAvailability, page: String(next) })
  const router = useRouter()
  const adminEditing = useAdminEditing()
  const noteEditing = (value: boolean) => {
    onEditingChange?.(value)
    adminEditing?.setEditing(value)
  }
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [target, setTarget] = useState('')
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

  async function toggleAvailability(product: Product) {
    if (busy.current) return
    busy.current = true; setPending(`availability:${product.id}`)
    try {
      const response = await setProductAvailability(product.id, !product.isOutOfStock, product.updatedAt ?? '')
      notify(response)
      if (response.ok) router.refresh()
    } catch { notify({ ok: false, message: 'تعذّر تحديث التوفر. حدّث القائمة للتحقق ثم حاول مجددًا.' }) }
    finally { busy.current = false; setPending(null) }
  }

  return <section className="mt-6" dir="rtl">
    {editing ? <FullProductEditor key={editing === 'new' ? 'new' : editing.id} categories={categories} product={editing === 'new' ? null : editing}
      onCancel={() => { setEditing(null); noteEditing(false) }} onSaved={(response) => { notify(response); setEditing(null); noteEditing(false); router.refresh() }} onError={notify} /> : <>
      <form className="flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); router.push('/admin/products?' + new URLSearchParams({ q: String(data.get('q') ?? ''), category: String(data.get('category') ?? ''), availability: String(data.get('availability') ?? ''), page: '1' })) }}>
        <input name="q" key={initialQuery} aria-label="البحث عن منتج" type="search" placeholder="ابحثي بالاسم أو الرابط" defaultValue={initialQuery} maxLength={150} className="min-w-0 flex-1 rounded-full border border-sand bg-white px-4 py-2" />
        <select name="category" aria-label="تصفية حسب القسم" defaultValue={initialCategory} className="min-w-0 max-w-full rounded-xl border border-sand bg-white p-2"><option value="">كل الأقسام</option>{categories.map(category => <option key={category.slug} value={category.slug}>{adminCategoryLabel(category, categories)}</option>)}</select>
        <select name="availability" aria-label="تصفية حسب التوفر" defaultValue={initialAvailability} className="rounded-xl border border-sand bg-white p-2"><option value="">كل حالات التوفر</option><option value="available">متاح للشراء</option><option value="unavailable">نفد من المخزون</option><option value="hidden">غير منشور</option></select>
        <button className={button}>تطبيق الفلاتر</button><Link className={button} href="/admin/products">مسح الفلاتر</Link>
        <button type="button" className={primary} disabled={!!pending} onClick={() => { setResult(null); setEditing('new'); noteEditing(true) }}>إضافة منتج</button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-sand p-3">
        <span>{selected.length} منتج محدد</span>
        <label>القسم الهدف <select aria-label="القسم الهدف للنقل" className="min-w-0 max-w-full rounded-lg border border-sand p-2" value={target} onChange={event=>setTarget(event.target.value)}><option value="">بدون قسم</option>{categories.map(category=><option key={category.slug} value={category.slug}>{adminCategoryLabel(category, categories)}</option>)}</select></label>
        <button className={button} disabled={!selected.length || !!pending} onClick={async()=>{
          if (busy.current || !confirm('نقل '+selected.length+' منتج إلى «'+(categories.find(category=>category.slug===target)?.name_ar ?? 'بدون قسم')+'»؟ سيُستبدل تصنيف المنتجات المحددة.')) return
          busy.current=true; setPending('bulk')
          try { const response=await moveProducts(selected,target||null); notify(response); if(response.ok){setSelected([]);router.refresh()} } catch {notify({ok:false,message:'تعذّر النقل. حدّث الصفحة للتحقق.'})} finally {busy.current=false;setPending(null)}
        }}>نقل إلى قسم</button><button className={button} disabled={!!pending} onClick={()=>setSelected([])}>مسح التحديد</button>
      </div>
      <div className="mt-5 grid gap-3">
        {products.map(product => <article key={product.id} className="flex flex-wrap items-center gap-4 rounded-[22px] border border-sand bg-white p-4">
          <label className="flex items-center gap-1"><input type="checkbox" aria-label={'تحديد '+product.nameAr} disabled={!!pending || (selected.length>=1000 && !selected.includes(product.id))} checked={selected.includes(product.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,product.id]:current.filter(id=>id!==product.id))} /></label>
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cream">
            {product.imageUrl ? <Image src={product.imageUrl} alt={product.nameAr} fill sizes="80px" className="object-contain" /> : <span className="flex h-full items-center justify-center text-xs">بدون صورة</span>}
          </div>
          <div className="min-w-0 flex-1"><h2 className="font-bold">{product.nameAr}</h2><p className="text-sm text-cocoa/60">{product.categoryLabel} · {formatJod(product.price, currency)}</p><p className="mt-1 text-xs">{product.isActive ? 'نشط' : 'غير نشط'}{product.isFeatured ? ' · مميز' : ''} · الترتيب {product.sortOrder ?? 0} · {product.variants.length} نوع</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <StockBadge outOfStock={isProductOutOfStock(product)} />
            <button type="button" role="switch" aria-checked={product.isOutOfStock === true} aria-label={`إيقاف شراء ${product.nameAr} يدويًا: نفد من المخزون`} className={`${button} bg-cream text-cocoa`} disabled={!!pending} onClick={() => toggleAvailability(product)}>
              {pending === `availability:${product.id}` ? 'جارٍ التحديث…' : product.isOutOfStock ? 'إلغاء نفاد المخزون' : 'تعيين: نفد من المخزون'}
            </button>
            <button type="button" className={button} disabled={!!pending} onClick={() => { setResult(null); setEditing(product); noteEditing(true) }}>تعديل</button><button type="button" className={`${button} text-rose`} disabled={!!pending} onClick={() => remove(product)}>{pending === product.id ? 'جارٍ الحذف…' : 'حذف'}</button>
          </div>
        </article>)}
        {!products.length && <p className="p-6 text-center">لا توجد منتجات مطابقة. غيّري الفلاتر أو أضيفي منتجًا جديدًا.</p>}
      </div>
      <nav className="mt-5 flex flex-wrap items-center justify-center gap-4" aria-label="صفحات المنتجات">
        {page>1 && <Link className={button} href={productPage(page - 1)}>السابق</Link>}
        <span>صفحة {page} من {Math.max(1,Math.ceil(total/30))} · {total} منتج</span>
        {page*30<total && <Link className={button} href={productPage(page + 1)}>التالي</Link>}
      </nav>
    </>}
    {result && <p role={result.ok ? 'status' : 'alert'} className={`mt-4 text-sm ${result.ok ? 'text-cocoa' : 'text-rose'}`}>{result.message}</p>}
    <Toast toast={toast} />
  </section>
}

export function FullProductEditor({ product, categories, onCancel, onSaved, onError }: { product: Product | null; categories: StoreCategory[]; onCancel: () => void; onSaved: (r: ActionResult) => void; onError: (r: ActionResult) => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [id] = useState(() => product?.id ?? crypto.randomUUID())
  const [variants, setVariants] = useState<ProductDraft['variants']>(() => product?.variants.map(v => ({ id: v.id, label: v.label, price: v.price, is_active: v.isActive ?? true, sort_order: v.sortOrder ?? 0 })) ?? [])
  const [categorySlugs, setCategorySlugs] = useState<string[]>(() => product?.categorySlugs ?? [])
  const [imageChoice, setImageChoice] = useState<ProductImageChoice>({ file: null, processed: null, confirmed: true, restore: false })
  const [discountEnabled,setDiscountEnabled]=useState(product?.discountEnabled ?? false)
  const [isOutOfStock, setIsOutOfStock] = useState(product?.isOutOfStock ?? false)
  const [originalPrice,setOriginalPrice]=useState(String(product?.originalPrice ?? product?.oldPrice ?? product?.price ?? 0))
  const [salePrice,setSalePrice]=useState(product?.discountEnabled ? String(product.price) : '')
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(false)
  const [dirty, setDirty] = useState(false)
  const busy = useRef(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || pending) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, pending])
  function updateVariant(index: number, patch: Partial<ProductDraft['variants'][number]>) {
    setDirty(true)
    setVariants(current => current.map((v, i) => i === index ? { ...v, ...patch } : v))
  }
  async function save(element: HTMLFormElement, choice = imageChoice): Promise<boolean> {
    if (busy.current || !choice.confirmed || !element.reportValidity()) return false
    setError('')
    const form = new FormData(element)
    const text = (key: string) => String(form.get(key) ?? '').trim()
    const draft: ProductDraft = {
      id, updatedAt: product?.updatedAt ?? null, slug: text('slug'), name_ar: text('name_ar'), name_en: text('name_en'),
      description: text('description') || null, category: product?.category ?? categorySlugs[0] ?? 'uncategorized', category_label: categories.find(category => categorySlugs.includes(category.slug))?.name_ar ?? 'بدون قسم',
      category_slugs: categorySlugs, stock_quantity: text('stock_quantity') === '' ? null : Number(text('stock_quantity')), is_out_of_stock: isOutOfStock,
      price: discountEnabled ? (salePrice.trim() ? Number(salePrice) : NaN) : Number(originalPrice), old_price: discountEnabled ? Number(originalPrice) : null,
      original_price: Number(originalPrice), discount_enabled: discountEnabled, is_new: form.has('is_new'),
      badge: product?.badge ?? null, benefits: text('benefits').split('\n').map(s => s.trim()).filter(Boolean),
      is_active: form.has('is_active'), is_featured: form.has('is_featured'), sort_order: Number(text('sort_order')),
      variants: variants.map(v => ({ ...v, label: v.label.trim() })),
    }
    try { validateProduct(draft) } catch (e) { setError((e as Error).message); return false }
    busy.current = true
    setPending(true)
    const body = new FormData()
    body.set('product', JSON.stringify(draft))
    if (choice.processed) { body.set('image', choice.processed, 'product.webp'); body.set('image_processed', 'true'); if (choice.file) body.set('original_image', choice.file) }
    else if (choice.file) body.set('image', choice.file)
    if (choice.processed || choice.file) body.set('image_confirmed', 'true')
    if (choice.restore) body.set('restore_image', 'true')
    try {
      const response = await new Promise<ActionResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/admin/products')
        xhr.timeout = 120_000
        xhr.upload.onprogress = e => setStatus(e.lengthComputable ? `جارٍ إرسال البيانات والصورة… ${Math.round(e.loaded / e.total * 100)}٪` : 'جارٍ إرسال البيانات…')
        xhr.upload.onload = () => setStatus(choice.file || choice.processed ? 'جارٍ رفع الصورة وحفظ المنتج…' : 'جارٍ حفظ المنتج…')
        xhr.onerror = xhr.ontimeout = () => reject(new Error('تعذر الاتصال. حدّثي القائمة للتحقق من الحفظ قبل إعادة المحاولة.'))
        xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)) } catch { reject(new Error('تعذر إتمام الطلب. حدّثي القائمة للتحقق ثم حاولي مجدداً.')) } }
        setStatus('جارٍ الحفظ…')
        xhr.send(body)
      })
      if (response.ok) { setDirty(false); onSaved(response) }
      else { setError(response.message); onError(response) }
      return response.ok
    } catch (e) { const message = (e as Error).message; setError(message); onError({ ok: false, message }); return false }
    finally { busy.current = false; setPending(false); setStatus('') }
  }
  return <form ref={formRef} onSubmit={event => { event.preventDefault(); void save(event.currentTarget) }} onChange={() => setDirty(true)} className="rounded-[24px] border border-sand bg-white p-4 md:p-6">
    <h2 className="mb-5 text-xl font-extrabold">{product ? `تعديل ${product.nameAr}` : 'إضافة منتج جديد'}</h2>
    <fieldset disabled={pending} className="min-w-0 space-y-5 disabled:opacity-70">
      <EditorGroup title="المعلومات الأساسية">        <Field label="الاسم العربي"><input name="name_ar" required maxLength={250} defaultValue={product?.nameAr} /></Field>
        <Field label="الاسم الإنجليزي"><input name="name_en" dir="ltr" required maxLength={250} defaultValue={product?.nameEn} /></Field>
        <Field label="الرابط المختصر (slug)"><input name="slug" dir="ltr" required maxLength={200} defaultValue={product?.slug} /></Field>      <Field label="الوصف"><textarea name="description" rows={4} maxLength={10000} defaultValue={product?.description ?? ''} /></Field>
      <Field label="الفوائد (كل فائدة في سطر)"><textarea name="benefits" rows={3} defaultValue={product?.benefits.join('\n') ?? ''} /></Field></EditorGroup>
      <EditorGroup title="التسعير والخصم">        <label className="flex items-center gap-2"><input type="checkbox" checked={discountEnabled} onChange={event=>setDiscountEnabled(event.target.checked)} /> عليه خصم</label>
        <Field label="السعر الأصلي"><input name="original_price" type="number" min={discountEnabled?'0.001':'0'} max="100000" step="0.001" required value={originalPrice} onChange={event=>setOriginalPrice(event.target.value)} /></Field>
        {discountEnabled && <Field label="السعر بعد الخصم"><input name="sale_price" type="number" min="0" max="100000" step="0.001" required value={salePrice} onChange={event=>setSalePrice(event.target.value)} /><small>{Number(originalPrice)>0 && salePrice!=='' && Number(salePrice)<Number(originalPrice) ? 'خصم '+Number(((1-Number(salePrice)/Number(originalPrice))*100).toPrecision(3))+'٪' : 'يجب أن يكون السعر المخفّض أقل من السعر الأصلي.'}</small></Field>}</EditorGroup>
      <EditorGroup title="صور المنتج"><div className="min-w-0 sm:col-span-2"><ProductImageEditor productId={id} updatedAt={product?.updatedAt} imageUrl={product?.imageUrl} originalImageUrl={product?.originalImageUrl}
        onChange={choice => { setImageChoice(choice); setDirty(true) }} onApprove={choice => formRef.current ? save(formRef.current, choice) : Promise.resolve(false)} /></div></EditorGroup>
      <EditorGroup title="الأقسام الرئيسية والفرعية">        <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-bold">أقسام المنتج</legend><label className="mb-3 block"><input type="checkbox" checked={!categorySlugs.length} onChange={()=>setCategorySlugs([])} /> بدون قسم</label><div className="flex flex-wrap gap-3">{categories.map(category => <label key={category.slug} className="text-sm"><input type="checkbox" checked={categorySlugs.includes(category.slug)} onChange={event => setCategorySlugs(current => event.target.checked ? [...current, category.slug] : current.filter(slug => slug !== category.slug))} /> {adminCategoryLabel(category, categories)}{!category.is_active && ' (مخفي)'}</label>)}</div>{!categories.length && <p className="text-sm">أضف قسماً من تبويب الأقسام أولاً.</p>}</fieldset></EditorGroup>
      <EditorGroup title="المخزون والتوفر">        <Field label="المخزون (فارغ إذا لم يُسجّل)"><input name="stock_quantity" type="number" min="0" max="2147483647" step="1" defaultValue={product?.stockQuantity ?? ''} /></Field>
        <div className="rounded-2xl border border-sand bg-cream p-4 sm:col-span-2">
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" role="switch" name="is_out_of_stock" checked={isOutOfStock} onChange={event => setIsOutOfStock(event.target.checked)} className="h-5 w-5 accent-cocoa" />نفد من المخزون</label>
          <p className="mt-2 text-sm text-cocoa/70">فعّل هذا المفتاح لإيقاف الشراء دون إخفاء المنتج أو تغيير الكمية المسجلة. إلغاؤه لا يعيد توفر منتج كميته صفر.</p>
        </div></EditorGroup>
      <EditorGroup title="الظهور والترتيب">        <label className="flex items-center gap-2"><input type="checkbox" name="is_new" defaultChecked={product?.isNew ?? false} /> جديد</label>        <Field label="الترتيب (الأصغر أولاً)"><input name="sort_order" type="number" min="-2147483647" max="2147483647" step="1" required defaultValue={product?.sortOrder ?? 0} /></Field>
        <div className="flex items-center gap-5"><label><input type="checkbox" name="is_active" defaultChecked={product?.isActive ?? true} /> نشط</label><label><input type="checkbox" name="is_featured" defaultChecked={product?.isFeatured ?? false} /> مميز</label></div></EditorGroup>
      <section className="space-y-3 border-t border-sand pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">أنواع المنتج — أسعار أصلية قبل الخصم</h3><button type="button" className={button} disabled={variants.length >= 100} onClick={() => { setDirty(true); setVariants(v => [...v, { id: crypto.randomUUID(), label: '', price: Number(originalPrice) || 0, is_active: true, sort_order: v.length }]) }}>إضافة نوع</button></div>
        {!variants.length && <p className="text-sm text-cocoa/60">لا توجد أنواع. سيستخدم المتجر السعر الأساسي.</p>}
        {variants.map((v, index) => <div key={v.id} className="grid items-end gap-3 rounded-2xl border border-sand p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="اسم النوع"><input required maxLength={250} value={v.label} onChange={e => updateVariant(index, { label: e.target.value })} /></Field>
          <Field label="السعر"><input type="number" required min="0" max="100000" step="0.001" value={Number.isNaN(v.price) ? '' : v.price} onChange={e => updateVariant(index, { price: e.target.valueAsNumber })} /></Field>
          <Field label="الترتيب"><input type="number" required min="-2147483647" max="2147483647" step="1" value={Number.isNaN(v.sort_order) ? '' : v.sort_order} onChange={e => updateVariant(index, { sort_order: e.target.valueAsNumber })} /></Field>
          <label className="py-2"><input type="checkbox" checked={v.is_active} onChange={e => updateVariant(index, { is_active: e.target.checked })} /> نشط</label>
          <button type="button" className={`${button} text-rose`} onClick={() => { if (window.confirm(`إزالة النوع «${v.label || 'الجديد'}» عند حفظ المنتج؟`)) { setDirty(true); setVariants(current => current.filter(item => item.id !== v.id)) } }}>حذف النوع</button>
        </div>)}
      </section>
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={!imageChoice.confirmed} className={primary}>{pending ? 'جارٍ الحفظ…' : 'حفظ المنتج'}</button><button type="button" className={button} onClick={() => { if (!dirty || window.confirm('تجاهل التعديلات غير المحفوظة؟')) onCancel() }}>إلغاء والعودة</button></div>
    </fieldset>
    {pending && <p role="status" className="mt-4 text-sm">{status}</p>}
    {error && <p role="alert" className="mt-4 text-sm text-rose">{error}</p>}
  </form>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 text-sm"><span className="mb-1 block font-bold text-cocoa/70">{label}</span><span className="block [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-xl [&_input]:border [&_input]:border-sand [&_input]:p-2.5 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-sand [&_textarea]:p-2.5 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-sand [&_select]:p-2.5">{children}</span></label>
}

function EditorGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="min-w-0 rounded-2xl border border-sand p-4"><legend className="px-2 font-bold">{title}</legend><div className="grid min-w-0 gap-4 sm:grid-cols-2">{children}</div></fieldset>
}
