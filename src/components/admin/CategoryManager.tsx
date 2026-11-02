'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteStoreCategory, saveStoreCategory, type ActionResult } from '@/app/admin/actions'
import type { StoreCategory } from '@/types/store'

const button = 'rounded-full border border-sand px-4 py-2 text-sm font-bold disabled:opacity-40'

export default function CategoryManager({ categories, onEditingChange }: { categories: StoreCategory[]; onEditingChange: (editing: boolean) => void }) {
  const router = useRouter()
  const [editing, setEditing] = useState<StoreCategory | 'new' | null>(null)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, start] = useTransition()
  const edit = (category: StoreCategory | 'new' | null) => { setEditing(category); onEditingChange(category !== null); setResult(null) }
  const current = editing && editing !== 'new' ? editing : null

  return <section className="mt-6" dir="rtl">
    {editing ? <form key={current?.slug ?? 'new'} className="space-y-4 rounded-3xl border border-sand bg-white p-5" onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      start(async () => {
        try {
          const response = await saveStoreCategory({
            slug: current?.slug ?? String(data.get('slug') ?? '').trim(), name_ar: String(data.get('name_ar') ?? '').trim(),
            parent_slug: String(data.get('parent_slug') ?? '') || null, sort_order: Number(data.get('sort_order')),
            is_active: data.has('is_active'), updated_at: current?.updated_at ?? null,
          })
          setResult(response)
          if (response.ok) { setEditing(null); onEditingChange(false); router.refresh() }
        } catch { setResult({ ok: false, message: 'تعذّر الاتصال. حدّث القائمة للتحقق قبل إعادة المحاولة.' }) }
      })
    }}>
      <h2 className="text-lg font-bold">{current ? 'تعديل القسم' : 'إضافة قسم'}</h2>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 [&_input]:rounded-xl [&_input]:border [&_input]:border-sand [&_input]:p-2.5 [&_select]:rounded-xl [&_select]:border [&_select]:border-sand [&_select]:p-2.5">
        <label className="grid gap-1">اسم القسم<input name="name_ar" required maxLength={150} defaultValue={current?.name_ar} /></label>
        <label className="grid gap-1">رابط القسم<input name="slug" dir="ltr" required readOnly={!!current} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} defaultValue={current?.slug} /><small>يبقى رابط القسم ثابتاً بعد إنشائه لحماية الروابط المحفوظة.</small></label>
        <label className="grid gap-1">القسم الرئيسي<select name="parent_slug" defaultValue={current?.parent_slug ?? ''}><option value="">قسم رئيسي</option>{categories.filter(category => !category.parent_slug && category.slug !== current?.slug).map(category => <option key={category.slug} value={category.slug}>{category.name_ar}</option>)}</select></label>
        <label className="grid gap-1">الترتيب<input name="sort_order" type="number" step="1" min="-2147483647" max="2147483647" required defaultValue={current?.sort_order ?? 0} /></label>
        <label><input type="checkbox" name="is_active" defaultChecked={current?.is_active ?? true} /> ظاهر في المتجر</label>
      </fieldset>
      <div className="flex gap-3"><button disabled={pending} className={`${button} bg-cocoa text-white`}>{pending ? 'جارٍ الحفظ…' : 'حفظ القسم'}</button><button type="button" disabled={pending} className={button} onClick={() => edit(null)}>إلغاء</button></div>
    </form> : <>
      <button className={`${button} bg-cocoa text-white`} onClick={() => edit('new')}>إضافة قسم</button>
      <div className="mt-4 grid gap-3">{categories.map(category => <article key={category.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-white p-4">
        <div><h2 className="font-bold">{category.name_ar}</h2><p className="text-sm text-cocoa/60">{category.parent_slug ? categories.find(parent => parent.slug === category.parent_slug)?.name_ar : 'قسم رئيسي'} · الترتيب {category.sort_order} · {category.is_active ? 'ظاهر' : 'مخفي'}</p><p className="text-xs" dir="ltr">/category/{category.slug}</p></div>
        <div className="flex gap-2"><button disabled={pending} className={button} onClick={() => edit(category)}>تعديل</button><button disabled={pending} className={`${button} text-rose`} onClick={() => {
          if (!confirm(`حذف قسم «${category.name_ar}»؟ ستُحفظ المنتجات، وتُزال روابطها بهذا القسم فقط.`)) return
          start(async () => {
            try { const response = await deleteStoreCategory(category.slug, category.updated_at); setResult(response); if (response.ok) router.refresh() }
            catch { setResult({ ok: false, message: 'تعذّر الاتصال. حدّث القائمة للتحقق قبل إعادة المحاولة.' }) }
          })
        }}>حذف</button></div>
      </article>)}</div>
      {!categories.length && <p className="p-6 text-center">لا توجد أقسام بعد.</p>}
    </>}
    {result && <p role={result.ok ? 'status' : 'alert'} className="mt-4">{result.message}</p>}
  </section>
}
