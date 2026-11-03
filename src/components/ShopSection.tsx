'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import CategoryLink from './CategoryLink'
import { ProductGridSkeleton } from './StoreSkeleton'
import type { CartItem, Product } from '@/types/product'
import ProductCard from './ProductCard'
import productStyles from './ProductCard.module.css'
import { matchesProduct } from '@/lib/search'
import { ArrowIcon } from './icons'
import type { Collection } from '@/lib/taxonomy'

const INITIAL_VISIBLE = 12

interface ShopSectionProps {
  groups: Collection[]
  initialCategory?: string
  cart: CartItem[]
  products: Product[]
  currency: string
  pageTitle?: string
  query: string
  unavailable?: boolean
  favorites: string[]
  selectedVariants: Record<string, string>
  onSelectVariant: (productId: string, variantId: string) => void
  onToggleFavorite: (productId: string) => void
  onAddToCart: (productId: string, variantId: string | null) => void | boolean
  onOpenDetails: (productId: string) => void
}

export default function ShopSection({ groups, initialCategory = 'all', cart, products, currency, pageTitle, query, unavailable = false, favorites, selectedVariants, onSelectVariant, onToggleFavorite, onAddToCart, onOpenDetails }: ShopSectionProps) {
  const category = initialCategory
  const flatten = (items: Collection[]): Collection[] => items.flatMap(item => [item, ...flatten(item.children)])
  const categories = flatten(groups)
  const [pagination, setPagination] = useState({ key: '', count: INITIAL_VISIBLE })
  const [navigating, setNavigating] = useState(false)
  const [sort, setSort] = useState('featured')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [onlyDiscounted, setOnlyDiscounted] = useState(false)
  const [onlyNew, setOnlyNew] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const begin = () => setNavigating(true)
    const reset = () => setNavigating(false)
    window.addEventListener('store:navigate', begin)
    window.addEventListener('popstate', reset)
    return () => { window.removeEventListener('store:navigate', begin); window.removeEventListener('popstate', reset) }
  }, [])
  useEffect(() => {
    const dialog = filterDialog.current
    if (!dialog || !filtersOpen) return
    dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [filtersOpen])
  const viewKey = `${category}:${pageTitle ?? 'home'}:${query}`

  const visible = useMemo(() => {
    const result = products.filter(product => matchesProduct(product, query)
      && (!onlyAvailable || product.stockQuantity == null || product.stockQuantity > 0)
      && (!onlyDiscounted || Boolean(product.oldPrice && product.oldPrice > product.price))
      && (!onlyNew || /^(new|جديد)$/i.test(product.badge?.trim() ?? '')))
    const priceOf = (product: Product) => product.variants[0]?.price ?? product.price
    if (sort === 'price-asc') result.sort((a, b) => priceOf(a) - priceOf(b))
    if (sort === 'price-desc') result.sort((a, b) => priceOf(b) - priceOf(a))
    if (sort === 'name') result.sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'))
    return result
  }, [query, products, sort, onlyAvailable, onlyDiscounted, onlyNew])

  const visibleCount = pagination.key === viewKey ? pagination.count : INITIAL_VISIBLE
  const rendered = visible.slice(0, visibleCount)
  const favoriteSet = new Set(favorites)

  useEffect(() => {
    window.dispatchEvent(new Event('boutique:layout'))
  }, [pageTitle, query, visibleCount, visible.length])

  const showMore = () => {
    setPagination({ key: viewKey, count: visibleCount + INITIAL_VISIBLE })
  }

  if (navigating) return <section id="shop" className="beauty-shop"><ProductGridSkeleton /></section>

  return <section id="shop" className={`beauty-shop ${pageTitle ? 'catalogue-page' : ''} ${productStyles.listing}`}>
    <div className="collection-heading"><h1>{query.trim() ? `نتائج البحث: ${query.trim()}` : pageTitle ?? 'المتجر'}</h1><span aria-live="polite">{visible.length} منتج</span></div>

    <nav className="shop-category-strip" aria-label="أقسام المتجر" dir="rtl">
      {[{ id: 'all', label: 'الكل' }, ...categories].map(item => <CategoryLink key={item.id} slug={item.id === 'all' ? null : item.id} aria-current={category === item.id ? 'page' : undefined}>{item.label}</CategoryLink>)}
    </nav>
    <div className="shop-tools">
      <div className="catalog-controls">
        <label className="catalog-sort">ترتيب
          <select value={sort} onChange={event => setSort(event.target.value)} aria-label="ترتيب المنتجات">
            <option value="featured">المميزة</option>
            <option value="price-asc">السعر: الأقل</option>
            <option value="price-desc">السعر: الأعلى</option>
            <option value="name">الاسم</option>
          </select>
        </label>
        <button className="filter-open" type="button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/></svg>
          تصفية
          {(onlyAvailable || onlyDiscounted || onlyNew) && <i aria-label="فلاتر مفعلة">{Number(onlyAvailable)+Number(onlyDiscounted)+Number(onlyNew)}</i>}
        </button>
      </div>
    </div>

    <p className={productStyles.hint}>اضغط مطوّلًا على أي صورة لتكبيرها، واضغط على القسيمة للإضافة إلى السلة</p>
    <dialog ref={filterDialog} className="shop-filter-sheet" aria-labelledby="filter-title" onCancel={event => { event.preventDefault(); setFiltersOpen(false) }} onClick={event => { if (event.target === event.currentTarget) setFiltersOpen(false) }}>
      <div className="filter-sheet-head"><h2 id="filter-title">تصفية المنتجات</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label="إغلاق التصفية">×</button></div>
      <label><input type="checkbox" checked={onlyAvailable} onChange={event => setOnlyAvailable(event.target.checked)} /> المتوفر الآن</label>
      <label><input type="checkbox" checked={onlyDiscounted} onChange={event => setOnlyDiscounted(event.target.checked)} /> عليه خصم</label>
      <label><input type="checkbox" checked={onlyNew} onChange={event => setOnlyNew(event.target.checked)} /> جديد</label>
      <div className="filter-sheet-actions"><button type="button" onClick={() => { setOnlyAvailable(false); setOnlyDiscounted(false); setOnlyNew(false) }}>مسح التصفية</button><button type="button" onClick={() => setFiltersOpen(false)}>عرض {visible.length} منتج</button></div>
    </dialog>

    {visible.length
      ? <>
          <div className={productStyles.grid}>
            {rendered.map((product, index) => <ProductCard
              key={product.id}
              product={product}
              eager={Boolean(pageTitle) && index < 2}
              deferImage={!pageTitle || index >= 4}
              quantity={cart.find(item => item.productId === product.id && item.variantId === (selectedVariants[product.id] ?? product.variants[0]?.id ?? null))?.quantity ?? 0}
              currency={currency}
              isFavorite={favoriteSet.has(product.id)}
              selectedVariantId={selectedVariants[product.id] ?? product.variants[0]?.id ?? null}
              onSelectVariant={onSelectVariant}
              onToggleFavorite={onToggleFavorite}
              onAddToCart={onAddToCart}
              onOpenDetails={onOpenDetails}
            />)}
          </div>

          {rendered.length < visible.length && <div className="shop-more">
            <p><strong>{rendered.length}</strong> من {visible.length}</p>
            <button className="shop-more-button" onClick={showMore}>
              <span>عرض المزيد</span>
              <ArrowIcon />
            </button>
          </div>}
        </>
      : <div className="empty-collection">
          <span className="empty-mark" aria-hidden="true">✳</span>
          <h3>{unavailable ? 'تعذّر تحميل المنتجات حالياً.' : query ? 'لا توجد نتائج لهذا البحث.' : 'لا توجد منتجات متاحة حالياً.'}</h3>
          <p>{unavailable ? 'يرجى المحاولة مجدداً بعد قليل.' : 'ستظهر المنتجات هنا عند توفرها في المتجر.'}</p>
          <CategoryLink className="scene-button" slug={null}>جميع المنتجات</CategoryLink>
        </div>}
  </section>
}
