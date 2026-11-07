'use client'

import StockBadge from '@/components/StockBadge'
import { isProductOutOfStock } from '@/lib/cart'
import Image from 'next/image'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveHomeSection, searchAdminProducts } from '@/app/admin/actions'
import { formatJod } from '@/lib/format'
import type { Product } from '@/types/product'
import { useAdminEditing } from './AdminEditing'

export interface HomeSectionDraft { section: 'hero' | 'bestsellers'; updated_at: string; products: Product[] }
const button = 'rounded-full border border-sand px-4 py-2 text-sm font-bold disabled:opacity-40'

export default function HomeSectionManager({ section, onEditingChange }: { section: HomeSectionDraft; onEditingChange?: (editing: boolean) => void }) {
  const router = useRouter()
  const adminEditing = useAdminEditing()
  const noteEditing = (value: boolean) => {
    onEditingChange?.(value)
    adminEditing?.setEditing(value)
  }
  const [items, setItems] = useState(section.products)
  const [results, setResults] = useState<Product[]>([])
  const [pending, start] = useTransition()
  const [message, setMessage] = useState('')
  const [searched, setSearched] = useState(false)
  const [preview, setPreview] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [dragging, setDragging] = useState<number | null>(null)
  const update = (next: Product[]) => { setItems(next); noteEditing(true); setMessage('') }
  const move = (index: number, delta: number) => {
    if (pending || index + delta < 0 || index + delta >= items.length) return
    const next = [...items]
    ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
    update(next)
    setAnnouncement(`تم نقل ${items[index].nameAr} إلى الموضع ${index + delta + 1}`)
  }
  return <section className="mt-6 space-y-4" dir="rtl">
    <h2 className="text-xl font-bold">{section.section === 'hero' ? 'منتجات الهيرو' : 'منتجات الأكثر طلبًا'}</h2>
    <p>رتّب الاختيارات بالسحب أو بأزرار التحريك. حفظ قائمة فارغة يخفي هذا القسم من الرئيسية.{section.section === 'hero' && ' تصميم الهيرو يعرض حتى خمسة منتجات.'}</p>
    <form className="flex flex-wrap gap-3" onSubmit={event => {
      event.preventDefault()
      const query = String(new FormData(event.currentTarget).get('q') ?? '')
      start(async () => { try { setResults(await searchAdminProducts(query)); setSearched(true); setMessage('') } catch { setMessage('تعذّر البحث. حاول مجدداً.') } })
    }}>
      <input disabled={pending} type="search" name="q" aria-label="البحث عن منتج بالاسم" maxLength={150} className="min-w-0 flex-1 rounded-xl border border-sand p-3" placeholder="اسم المنتج" />
      <button className={button} disabled={pending}>بحث</button>
    </form>
    <h3 className="font-bold">البحث وإضافة المنتجات</h3>
    {searched && !results.length && <p role="status">لا توجد نتائج مطابقة.</p>}
    <div className="grid gap-2">{results.map(product => <div key={product.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-sand bg-white p-3">
      <Thumbnail product={product} /><span className="min-w-0 flex-1">{product.nameAr} — {formatJod(product.price)}{!product.isActive && ' (غير منشور)'}</span>
      <StockBadge outOfStock={isProductOutOfStock(product)} /><button className={button} disabled={pending || items.some(item => item.id === product.id) || items.length >= (section.section === 'hero' ? 5 : 100)} onClick={() => update([...items, product])}>{items.some(item => item.id === product.id) ? 'مضاف' : 'إضافة'}</button>
    </div>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">المنتجات المختارة <bdi dir="ltr">({items.length} / {section.section === 'hero' ? 5 : 100})</bdi></h3><button className={button} aria-expanded={preview} aria-controls="selection-preview" onClick={() => setPreview(value => !value)}>{preview ? 'إخفاء المعاينة' : 'معاينة الاختيارات'}</button></div>
    {!items.length && <p className="rounded-xl bg-cream p-4">القائمة فارغة. ابحثي عن منتج لإضافته؛ حفظها فارغة يخفي القسم.</p>}
    {preview && <section id="selection-preview" className="rounded-2xl border border-sand bg-cream p-4"><h3 className="font-bold">معاينة ترتيب العرض — {section.section === 'hero' ? 'الهيرو' : 'الأكثر طلبًا'}</h3><p className="my-2 text-sm">معاينة للاختيارات قبل الحفظ. المنتجات غير المنشورة لا تظهر في المتجر، والمنتجات النافدة تبقى ظاهرة.</p><ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{items.filter(product => product.isActive).map((product, index) => <li key={product.id} className="min-w-0 space-y-2 rounded-xl bg-white p-3"><Thumbnail product={product} /><p className="break-words text-sm font-bold">{index + 1}. {product.nameAr}</p><p className="text-sm">{formatJod(product.price)}</p><StockBadge outOfStock={isProductOutOfStock(product)} /></li>)}</ol></section>}
    <p className="sr-only" role="status">{announcement}</p>
    <ol className="space-y-3">{items.map((product, index) => <li key={product.id} draggable={!pending} onDragStart={() => setDragging(index)} onDragEnd={() => setDragging(null)} onDragOver={event => event.preventDefault()} onDrop={event => {
      event.preventDefault()
      if (pending || dragging === null || dragging === index) return
      const next = [...items]; const [item] = next.splice(dragging, 1); next.splice(index, 0, item); update(next); setDragging(null)
    }} className="flex flex-wrap items-center gap-3 rounded-xl border border-sand bg-white p-3">
      <Thumbnail product={product} /><span className="min-w-0 flex-1">{index + 1}. {product.nameAr}{!product.isActive && ' (لن يظهر حتى نشره)'}</span>
      <StockBadge outOfStock={isProductOutOfStock(product)} /><div className="flex flex-wrap gap-2"><button className={`${button} min-h-11 min-w-11`} aria-label={`تحريك ${product.nameAr} للأعلى`} disabled={pending || index === 0} onClick={() => move(index, -1)}>↑</button><button className={`${button} min-h-11 min-w-11`} aria-label={`تحريك ${product.nameAr} للأسفل`} disabled={pending || index === items.length - 1} onClick={() => move(index, 1)}>↓</button><button className={button} disabled={pending} onClick={() => update(items.filter(item => item.id !== product.id))}>إزالة من القائمة</button></div>
    </li>)}</ol>
    <div className="flex flex-wrap gap-3"><button className={`${button} bg-cocoa text-white`} disabled={pending} onClick={() => start(async () => {
      try { const response = await saveHomeSection(section.section, items.map(item => item.id), section.updated_at); setMessage(response.message); if (response.ok) { noteEditing(false); router.refresh() } } catch { setMessage('تعذّر الاتصال. حدّث الصفحة للتحقق من الحفظ.') }
    })}>{pending ? 'جارٍ الحفظ…' : 'حفظ القائمة'}</button><button className={button} disabled={pending} onClick={() => { setItems(section.products); setMessage('تم إلغاء التعديلات.'); noteEditing(false) }}>إلغاء التعديلات</button></div>
    <p role="status">{message}</p>
  </section>
}

function Thumbnail({ product }: { product: Product }) {
  return <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream">{product.imageUrl && <Image src={product.imageUrl} alt={product.nameAr} fill sizes="64px" className="object-contain" />}</span>
}
