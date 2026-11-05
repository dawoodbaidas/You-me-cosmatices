'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveHomeSection, searchAdminProducts } from '@/app/admin/actions'
import { formatJod } from '@/lib/format'
import type { Product } from '@/types/product'

export interface HomeSectionDraft { section: 'hero' | 'bestsellers'; updated_at: string; products: Product[] }
const button = 'rounded-full border border-sand px-4 py-2 text-sm font-bold disabled:opacity-40'

export default function HomeSectionManager({ section, onEditingChange }: { section: HomeSectionDraft; onEditingChange: (editing: boolean) => void }) {
  const router = useRouter()
  const [items, setItems] = useState(section.products)
  const [results, setResults] = useState<Product[]>([])
  const [pending, start] = useTransition()
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState<number | null>(null)
  const update = (next: Product[]) => { setItems(next); onEditingChange(true); setMessage('') }
  const move = (index: number, delta: number) => {
    const next = [...items]
    ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
    update(next)
  }
  return <section className="mt-6 space-y-4" dir="rtl">
    <h2 className="text-xl font-bold">{section.section === 'hero' ? 'منتجات الهيرو' : 'منتجات الأكثر طلبًا'}</h2>
    <p>رتّب الاختيارات بالسحب أو بأزرار التحريك. حفظ قائمة فارغة يخفي هذا القسم من الرئيسية.{section.section === 'hero' && ' تصميم الهيرو يعرض حتى خمسة منتجات.'}</p>
    <form className="flex flex-wrap gap-3" onSubmit={event => {
      event.preventDefault()
      const query = String(new FormData(event.currentTarget).get('q') ?? '')
      start(async () => { try { setResults(await searchAdminProducts(query)); setMessage('') } catch { setMessage('تعذّر البحث. حاول مجدداً.') } })
    }}>
      <input name="q" aria-label="البحث عن منتج بالاسم" maxLength={150} className="min-w-0 flex-1 rounded-xl border border-sand p-3" placeholder="اسم المنتج" />
      <button className={button} disabled={pending}>بحث</button>
    </form>
    <div className="grid gap-2">{results.map(product => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-sand bg-white p-3">
      <Thumbnail product={product} /><span className="min-w-0 flex-1">{product.nameAr} — {formatJod(product.price)} د.أ{!product.isActive && ' (غير منشور)'}</span>
      <button className={button} disabled={pending || items.some(item => item.id === product.id) || items.length >= (section.section === 'hero' ? 5 : 100)} onClick={() => update([...items, product])}>إضافة</button>
    </div>)}</div>
    <ol className="space-y-3">{items.map((product, index) => <li key={product.id} draggable={!pending} onDragStart={() => setDragging(index)} onDragEnd={() => setDragging(null)} onDragOver={event => event.preventDefault()} onDrop={event => {
      event.preventDefault()
      if (pending || dragging === null || dragging === index) return
      const next = [...items]; const [item] = next.splice(dragging, 1); next.splice(index, 0, item); update(next); setDragging(null)
    }} className="flex flex-wrap items-center gap-3 rounded-xl border border-sand bg-white p-3">
      <Thumbnail product={product} /><span className="min-w-0 flex-1">{index + 1}. {product.nameAr}{!product.isActive && ' (لن يظهر حتى نشره)'}</span>
      <div className="flex gap-2"><button className={button} aria-label={`تحريك ${product.nameAr} للأعلى`} disabled={pending || index === 0} onClick={() => move(index, -1)}>↑</button><button className={button} aria-label={`تحريك ${product.nameAr} للأسفل`} disabled={pending || index === items.length - 1} onClick={() => move(index, 1)}>↓</button><button className={button} disabled={pending} onClick={() => update(items.filter(item => item.id !== product.id))}>إزالة من القائمة</button></div>
    </li>)}</ol>
    <div className="flex gap-3"><button className={`${button} bg-cocoa text-white`} disabled={pending} onClick={() => start(async () => {
      try { const response = await saveHomeSection(section.section, items.map(item => item.id), section.updated_at); setMessage(response.message); if (response.ok) { onEditingChange(false); router.refresh() } } catch { setMessage('تعذّر الاتصال. حدّث الصفحة للتحقق من الحفظ.') }
    })}>{pending ? 'جارٍ الحفظ…' : 'حفظ القائمة'}</button><button className={button} disabled={pending} onClick={() => { setItems(section.products); onEditingChange(false) }}>إلغاء التعديلات</button></div>
    <p role="status">{message}</p>
  </section>
}

function Thumbnail({ product }: { product: Product }) {
  return <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream">{product.imageUrl && <Image src={product.imageUrl} alt={product.nameAr} fill sizes="64px" className="object-contain" />}</span>
}
