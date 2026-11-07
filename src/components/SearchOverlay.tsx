'use client'
import { productPricing } from '@/lib/pricing'
import Price from './Price'

import { useState } from 'react'
import ProductImage from './ProductImage'
import { matchesProduct } from '@/lib/search'
import BoutiqueDialog from './BoutiqueDialog'
import type { Product } from '@/types/product'
import './search-overlay.css'

export default function SearchOverlay({ products, currency, initialQuery = '', onClose, onSelect, onSubmit, loadError }: {
  loadError?: string | null
  products: Product[]; currency: string; initialQuery?: string; onClose: () => void; onSelect: (id: string) => void; onSubmit: (query: string) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const results = products.filter(product => matchesProduct(product, query))
  return <BoutiqueDialog open onClose={onClose} label="البحث عن المنتجات" className="search-dialog">
    <section className="search-sheet" dir="rtl">
      {loadError && <p role="alert">{loadError}</p>}
      <div className="search-sheet-header"><h2>ابحث عن اختيارك</h2><button onClick={onClose} aria-label="إغلاق البحث">×</button></div>
      <form className="overlay-search-form" onSubmit={event => { event.preventDefault(); onSubmit(query.trim()) }}>
        <label className="overlay-search-field"><span className="sr-only">اسم المنتج أو التصنيف</span><input data-dialog-autofocus type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="اسم المنتج أو التصنيف" /></label>
        <button type="submit" disabled={!query.trim()}>عرض النتائج</button>
      </form>
      <p role="status">{results.length} منتج</p>
      <div className="search-results">{results.map(product => <button key={product.id} className="search-result" onClick={() => onSelect(product.id)}>
        <span className="search-thumbnail"><ProductImage src={product.imageUrl} alt="" sizes="80px" /></span>
        <span>{product.nameAr}<small dir="ltr"><Price value={productPricing(product, product.variants[0]).price} oldPrice={productPricing(product, product.variants[0]).oldPrice} currency={currency}/></small></span>
      </button>)}{!results.length && <p>لم نجد منتجات مطابقة. جرّب اسمًا آخر.</p>}</div>
    </section>
  </BoutiqueDialog>
}
