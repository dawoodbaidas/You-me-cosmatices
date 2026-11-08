'use client'

import { useEffect, useState } from 'react'
import { productPricing } from '@/lib/pricing'
import { normalizeSearch } from '@/lib/search'
import Price from './Price'
import ProductImage from './ProductImage'
import BoutiqueDialog from './BoutiqueDialog'
import type { Product } from '@/types/product'
import './search-overlay.css'

export default function SearchOverlay({ currency, onClose, onSelect, onSubmit }: {
  currency: string; onClose: () => void; onSelect: (product: Product) => void; onSubmit: (query: string) => void
}) {
  const [query, setQuery] = useState('')
  const term = normalizeSearch(query)
  const [response, setResponse] = useState<{ term: string; products: Product[]; error: boolean } | null>(null)
  useEffect(() => {
    if (!term) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const result = await fetch(`/api/store/products?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: 'no-store' })
        if (!result.ok) throw new Error('Search unavailable')
        const products: Product[] = await result.json()
        if (!Array.isArray(products)) throw new Error('Invalid results')
        if (!controller.signal.aborted) setResponse({ term, products, error: false })
      } catch {
        if (!controller.signal.aborted) setResponse({ term, products: [], error: true })
      }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [term])
  const current = term && response?.term === term ? response : null
  const results = current?.products ?? []
  return <BoutiqueDialog open onClose={onClose} label="البحث عن المنتجات" className="search-dialog">
    <section className="search-sheet" dir="rtl">
      <div className="search-sheet-header"><h2>ابحث عن اختيارك</h2><button onClick={onClose} aria-label="إغلاق البحث">×</button></div>
      <form className="overlay-search-form" onSubmit={event => { event.preventDefault(); if (term) onSubmit(term) }}>
        <label className="overlay-search-field"><span className="sr-only">اسم المنتج</span><input data-dialog-autofocus type="search" maxLength={120} value={query} onChange={event => setQuery(event.target.value)} placeholder="اكتب اسم المنتج" /></label>
        <button type="submit" disabled={!term}>عرض النتائج</button>
      </form>
      <p role={current?.error ? 'alert' : 'status'}>{!term ? 'اكتب اسم المنتج لبدء البحث.' : !current ? 'جارٍ البحث…' : current.error ? 'تعذّر تحميل البحث. حاول مجددًا.' : results.length ? `${results.length} نتيجة${results.length === 40 ? ' كحد أقصى؛ حدّد الاسم لتضييق البحث' : ''}` : 'لم نجد منتجات مطابقة. جرّب اسمًا آخر.'}</p>
      <div className="search-results" aria-busy={Boolean(term && !current)}>{results.map(product => <button key={product.id} className="search-result" onClick={() => onSelect(product)}>
        <span className="search-thumbnail"><ProductImage src={product.imageUrl} alt="" sizes="80px" /></span>
        <span>{product.nameAr}<small dir="ltr"><Price value={productPricing(product, product.variants[0]).price} oldPrice={productPricing(product, product.variants[0]).oldPrice} currency={currency}/></small></span>
      </button>)}</div>
    </section>
  </BoutiqueDialog>
}
