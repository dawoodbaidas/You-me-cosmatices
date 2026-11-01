'use client'

import { useState } from 'react'
import ProductImage from './ProductImage'
import { matchesProduct } from '@/lib/search'
import BoutiqueDialog from './BoutiqueDialog'
import { formatJod } from '@/lib/format'
import type { Product } from '@/types/product'
import './search-overlay.css'

export default function SearchOverlay({ products, currency, onClose, onSelect }: {
  products: Product[]; currency: string; onClose: () => void; onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const results = products.filter(product => matchesProduct(product, query))
  return <BoutiqueDialog open onClose={onClose} label="البحث عن المنتجات" className="search-dialog">
    <section className="search-sheet" dir="rtl">
      <header><h2>ابحث عن اختيارك</h2><button onClick={onClose} aria-label="إغلاق البحث">×</button></header>
      <label className="overlay-search-field"><span className="sr-only">اسم المنتج أو التصنيف</span><input data-dialog-autofocus type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="اسم المنتج أو التصنيف" /></label>
      <p role="status">{results.length} منتج</p>
      <div className="search-results">{results.map(product => <button key={product.id} className="search-result" onClick={() => onSelect(product.id)}>
        <span className="search-thumbnail"><ProductImage src={product.imageUrl} alt="" sizes="80px" /></span>
        <span>{product.nameAr}<small dir="ltr">{formatJod(product.variants[0]?.price ?? product.price, currency)}</small></span>
      </button>)}{!results.length && <p>لم نجد منتجات مطابقة. جرّب اسمًا آخر.</p>}</div>
    </section>
  </BoutiqueDialog>
}
