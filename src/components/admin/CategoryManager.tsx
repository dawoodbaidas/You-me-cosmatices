'use client'

import Image from 'next/image'
import { categoryImage, categoryPath } from '@/lib/store-categories'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteStoreCategory, type ActionResult } from '@/app/admin/actions'
import type { StoreCategory } from '@/types/store'

const button = 'rounded-full border border-sand px-4 py-2 text-sm font-bold disabled:opacity-40'

export default function CategoryManager({ categories, counts, onEditingChange }: { categories: StoreCategory[]; counts: Record<string, number>; onEditingChange: (editing: boolean) => void }) {
  const router = useRouter()
  const [editing, setEditing] = useState<StoreCategory | 'new' | null>(null)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, start] = useTransition()
  const [deleting, setDeleting] = useState<StoreCategory | null>(null)
  const [transfer, setTransfer] = useState<boolean | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  useEffect(() => { if (preview) return () => URL.revokeObjectURL(preview) }, [preview])
  const allowedParent = (category: StoreCategory, key?: string) => {
    const seen = new Set<string>()
    let node: StoreCategory | undefined = category
    while (node && !seen.has(node.slug)) {
      if (node.slug === key) return false
      seen.add(node.slug); node = categories.find(c => c.slug === node!.parent_slug)
    }
    return true
  }
  const edit = (category: StoreCategory | 'new' | null) => { setEditing(category); onEditingChange(category !== null); setResult(null); setFile(null); setPreview(null); setImagePath(category && category !== 'new' ? category.image_path ?? null : null) }
  const current = editing && editing !== 'new' ? editing : null

  return <section className="mt-6" dir="rtl">
    {deleting && <form className="mb-5 space-y-4 rounded-2xl border border-sand bg-white p-5" onSubmit={event => {
      event.preventDefault()
      if (transfer === null) return
      const target = transfer ? String(new FormData(event.currentTarget).get('target') ?? '') : null
      start(async () => {
        try {
          const response = await deleteStoreCategory(deleting.slug, deleting.updated_at, target)
          setResult(response)
          if (response.ok) { setDeleting(null); onEditingChange(false); router.refresh() }
        } catch { setResult({ ok: false, message: 'تعذّر الاتصال. حدّث القائمة للتحقق قبل إعادة المحاولة.' }) }
      })
    }}>
      <h2 className="font-bold">حذف «{deleting.name_ar}» — {counts[deleting.slug] ?? 0} منتج مرتبط مباشرةً</h2>
      <p>لن يُحذف أي منتج أو قسم فرعي. اختر نقل السجلات أو فصلها صراحةً.</p>
      <label className="block"><input type="radio" name="mode" required checked={transfer === false} onChange={() => setTransfer(false)} /> فصل المنتجات عن هذا القسم وجعل الأقسام الفرعية أقسامًا رئيسية</label>
      <label className="block"><input type="radio" name="mode" required checked={transfer === true} onChange={() => setTransfer(true)} /> نقل المنتجات والأقسام الفرعية إلى قسم آخر</label>
      {transfer && <label className="block">القسم الهدف<select className="mx-3 rounded-xl border border-sand p-2" name="target" required defaultValue=""><option value="" disabled>اختر القسم</option>{categories.filter(category => allowedParent(category, deleting.slug)).map(category => <option key={category.slug} value={category.slug}>{category.name_ar}</option>)}</select></label>}
      <div className="flex gap-3"><button className={`${button} bg-cocoa text-white`} disabled={pending}>تأكيد حذف القسم</button><button type="button" className={button} disabled={pending} onClick={() => { setDeleting(null); onEditingChange(false) }}>إلغاء</button></div>
    </form>}
    {editing ? <form key={current?.slug ?? 'new'} className="space-y-4 rounded-3xl border border-sand bg-white p-5" onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      start(async () => {
        try {
          const body = new FormData()
          body.set('category', JSON.stringify({
            slug: current?.slug ?? crypto.randomUUID(), name_ar: String(data.get('name_ar') ?? '').trim(),
            parent_slug: String(data.get('parent_slug') ?? '') || null, sort_order: Number(data.get('sort_order')),
            is_active: data.has('is_active'), is_featured: data.has('is_featured'), image_path: imagePath, updated_at: current?.updated_at ?? null,
          }))
          if (file) body.set('image', file)
          const saved = await fetch('/api/admin/categories', { method: 'POST', body })
          const response = await saved.json() as ActionResult
          if (!saved.ok && response.ok) throw new Error('Invalid save response')
          setResult(response)
          if (response.ok) { setEditing(null); onEditingChange(false); router.refresh() }
        } catch { setResult({ ok: false, message: 'تعذّر الاتصال. حدّث القائمة للتحقق قبل إعادة المحاولة.' }) }
      })
    }}>
      <h2 className="text-lg font-bold">{current ? 'تعديل القسم' : 'إضافة قسم'}</h2>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 [&_input]:rounded-xl [&_input]:border [&_input]:border-sand [&_input]:p-2.5 [&_select]:rounded-xl [&_select]:border [&_select]:border-sand [&_select]:p-2.5">
        <label className="grid gap-1">اسم القسم<input name="name_ar" required maxLength={150} defaultValue={current?.name_ar} /></label>
        <p className="text-sm">يُنشأ الرابط تلقائيًا من الاسم. تبقى الروابط القديمة صالحة بعد تغيير الاسم أو القسم الأب.</p>
        <label className="grid gap-1">القسم الرئيسي<select name="parent_slug" defaultValue={current?.parent_slug ?? ''}><option value="">قسم رئيسي</option>{categories.filter(category => allowedParent(category, current?.slug)).map(category => <option key={category.slug} value={category.slug}>{category.name_ar}</option>)}</select></label>
        <label className="grid gap-1">الترتيب<input name="sort_order" type="number" step="1" min="-2147483647" max="2147483647" required defaultValue={current?.sort_order ?? 0} /></label>
        <label><input type="checkbox" name="is_active" defaultChecked={current?.is_active ?? true} /> ظاهر في المتجر</label>
        <label><input type="checkbox" name="is_featured" defaultChecked={current?.is_featured ?? false} /> قسم مميز</label>
        <div className="space-y-3 sm:col-span-2">
          <label className="grid gap-2">صورة القسم<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
            const selected = event.target.files?.[0]
            if (!selected) return
            if (!selected.size || selected.size > 4 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
              event.target.value = ''; setFile(null); setPreview(null)
              setResult({ ok: false, message: 'اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 4 MB.' }); return
            }
            setFile(selected); setPreview(URL.createObjectURL(selected)); setResult(null)
          }} /></label>
          {(preview || imagePath) && <><div className="relative h-36 w-36 overflow-hidden rounded-full"><Image src={preview ?? categoryImage(imagePath)!} alt="معاينة صورة القسم" fill sizes="144px" unoptimized={!!preview} className="object-cover" /></div><button type="button" className={button} onClick={() => { setFile(null); setPreview(null); setImagePath(null) }}>إزالة الصورة</button></>}
          <p className="text-sm">JPG، PNG، WebP حتى 4 MB. تحفظ نسخة WebP محسنة ويُعرض وسط الصورة داخل الدائرة.</p>
        </div>
      </fieldset>
      <div className="flex gap-3"><button disabled={pending} className={`${button} bg-cocoa text-white`}>{pending ? 'جارٍ الحفظ…' : 'حفظ القسم'}</button><button type="button" disabled={pending} className={button} onClick={() => edit(null)}>إلغاء</button></div>
    </form> : <>
      <button disabled={!!deleting} className={`${button} bg-cocoa text-white`} onClick={() => edit('new')}>إضافة قسم</button>
      <div className="mt-4 grid gap-3">{categories.map(category => <article key={category.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-white p-4">
        <div><h2 className="font-bold">{category.name_ar}</h2><p className="text-sm text-cocoa/60">{category.parent_slug ? categories.find(parent => parent.slug === category.parent_slug)?.name_ar : 'قسم رئيسي'} · الترتيب {category.sort_order} · {category.is_active ? 'ظاهر' : 'مخفي'}</p><p className="text-xs" dir="ltr">{decodeURIComponent(categoryPath(category, categories))}</p></div>
        <div className="flex gap-2"><button disabled={pending || !!deleting} className={button} onClick={() => edit(category)}>تعديل</button><button disabled={pending || !!deleting} className={`${button} text-rose`} onClick={() => { setDeleting(category); setTransfer(null); onEditingChange(true) }}>حذف</button></div>
      </article>)}</div>
      {!categories.length && <p className="p-6 text-center">لا توجد أقسام بعد.</p>}
    </>}
    {result && <p role={result.ok ? 'status' : 'alert'} className="mt-4">{result.message}</p>}
  </section>
}
