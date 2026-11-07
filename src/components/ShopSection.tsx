'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import CategoryLink from './CategoryLink'
import BoutiqueDialog from './BoutiqueDialog'
import { ProductGridSkeleton } from './StoreSkeleton'
import type { CartItem, Product } from '@/types/product'
import ProductCard from './ProductCard'
import productStyles from './ProductCard.module.css'
import { productPricing } from '@/lib/pricing'
import { isProductOutOfStock } from '@/lib/cart'
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

export default function ShopSection({ initialCategory = 'all', cart, products, currency, pageTitle, query, unavailable = false, favorites, selectedVariants, onSelectVariant, onToggleFavorite, onAddToCart, onOpenDetails }: ShopSectionProps) {
  const sentinel = useRef<HTMLDivElement>(null)
  const category = initialCategory
  const [pagination, setPagination] = useState({ key: '', count: INITIAL_VISIBLE })
  const [restore, setRestore] = useState<{url:string; y:number; count:number} | null>(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => { try { const saved = JSON.parse(sessionStorage.getItem('store-return') || 'null'); if (saved?.url === location.pathname + location.search && Number.isFinite(saved?.y)) { setRestore({ url: saved.url, y: Number(saved.y), count: Number.isInteger(saved.count) ? saved.count : 0 }); } sessionStorage.removeItem('store-return') } catch {} }); return () => cancelAnimationFrame(frame)
  }, [])
  const params = useSearchParams()
  const router = useRouter()
  const sort = params.get('sort') ?? 'featured'
  const onlyAvailable = params.get('available') === '1'
  const onlyDiscounted = params.get('discounted') === '1'
  const onlyNew = params.get('new') === '1'
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value); else next.delete(key)
    }
    router.push(window.location.pathname + (next.size ? '?' + next : ''), { scroll: false })
  }
  const setSort = (value: string) => update({ sort: value === 'featured' ? null : value })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterPosition, setFilterPosition] = useState({ top: 0, right: 0 })
  // Pending choices stay local until the user presses the apply button, so
  // dismissals never apply edits the visitor did not confirm. The draft is
  // re-seeded from the applied params every time the panel opens.
  const [draft, setDraft] = useState({ available: false, discounted: false, new: false })
  const openFilters = () => { setDraft({ available: onlyAvailable, discounted: onlyDiscounted, new: onlyNew }); setFiltersOpen(true) }
  const applyDraft = () => {
    update({ available: draft.available ? '1' : null, discounted: draft.discounted ? '1' : null, new: draft['new'] ? '1' : null })
    setFiltersOpen(false)
    window.dispatchEvent(new Event('boutique:layout'))
  }
  const clearFilters = () => {
    setDraft({ available: false, discounted: false, new: false })
    update({ available: null, discounted: null, new: null })
  }
  const activeFilterCount = Number(onlyAvailable) + Number(onlyDiscounted) + Number(onlyNew)
  const viewKey = `${category}:${pageTitle ?? 'home'}:${query}`

  const visible = useMemo(() => {
    const result = products.filter(product => matchesProduct(product, query)
      && (!onlyAvailable || !isProductOutOfStock(product))
      && (!onlyDiscounted || Boolean(productPricing(product).discount))
      && (!onlyNew || product.isNew === true))
    const priceOf = (product: Product) => productPricing(product, product.variants[0]).price
    if (sort === 'price-asc') result.sort((a, b) => priceOf(a) - priceOf(b))
    if (sort === 'price-desc') result.sort((a, b) => priceOf(b) - priceOf(a))
    if (sort === 'name') result.sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'))
    return result
  }, [query, products, sort, onlyAvailable, onlyDiscounted, onlyNew])

  const visibleCount = Math.max(pagination.key === viewKey ? pagination.count : INITIAL_VISIBLE, restore?.count ?? 0)
  const rendered = visible.slice(0, visibleCount)
  const favoriteSet = new Set(favorites)
  useEffect(() => { if (!restore) return; const frame = requestAnimationFrame(() => { window.scrollTo({top: restore.y, behavior:'instant'}); setRestore(null); setPagination({key:viewKey, count:Math.max(INITIAL_VISIBLE, restore.count)}) }); return () => cancelAnimationFrame(frame) }, [restore, viewKey])

  useEffect(() => {
    window.dispatchEvent(new Event('boutique:layout'))
  }, [pageTitle, query, visibleCount, visible.length])

  const showMore = () => {
    setPagination({ key: viewKey, count: visibleCount + INITIAL_VISIBLE })
  }

  useEffect(() => {
    const element = sentinel.current
    if (!element || rendered.length >= visible.length) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setPagination({ key: viewKey, count: visibleCount + INITIAL_VISIBLE })
    }, { rootMargin: '200px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [viewKey, visibleCount, rendered.length, visible.length])


  return <section id="shop" data-visible-count={visibleCount} className={`beauty-shop ${pageTitle ? 'catalogue-page' : ''} ${productStyles.listing}`}>
    <div className="collection-heading"><h1>{query.trim() ? `نتائج البحث: ${query.trim()}` : pageTitle ?? 'المتجر'}</h1><span aria-live="polite">{visible.length} منتج</span></div>

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
        <button className="filter-open" type="button" onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setFilterPosition({ top: rect.bottom + 8, right: Math.max(16, innerWidth - rect.right) }); openFilters() }} aria-haspopup="dialog" aria-expanded={filtersOpen} aria-label={`تصفية${activeFilterCount ? `، ${activeFilterCount} فلاتر مفعلة` : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/></svg>
          تصفية
          {activeFilterCount > 0 && <i aria-hidden="true">{activeFilterCount}</i>}
        </button>
      </div>
    </div>

    <p className={productStyles.hint}>اضغط مطوّلًا على أي صورة لتكبيرها، واضغط على القسيمة للإضافة إلى السلة</p>
    <BoutiqueDialog open={filtersOpen} onClose={() => setFiltersOpen(false)} label="تصفية المنتجات" className="filter-dialog">
    <div className="shop-filter-sheet" dir="rtl" style={{ '--filter-top': `${filterPosition.top}px`, '--filter-right': `${filterPosition.right}px` } as CSSProperties}>
      <div className="filter-sheet-head"><h2 id="filter-title">تصفية المنتجات</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label="إغلاق التصفية">×</button></div>
      <form onSubmit={event => { event.preventDefault(); applyDraft() }} className="shop-filter-form">
    <label><input type="checkbox" checked={draft.available} onChange={event => setDraft(current => ({ ...current, available: event.target.checked }))} /> المتوفر الآن</label>
    <label><input type="checkbox" checked={draft.discounted} onChange={event => setDraft(current => ({ ...current, discounted: event.target.checked }))} /> عليه خصم</label>
    <label><input type="checkbox" checked={draft['new']} onChange={event => setDraft(current => ({ ...current, 'new': event.target.checked }))} /> جديد</label>
    <div className="filter-sheet-actions"><button type="button" onClick={clearFilters}>إعادة تعيين</button><button type="submit">تطبيق التصفية</button></div>
    </form>
    </div></BoutiqueDialog>

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

          {rendered.length < visible.length && <div ref={sentinel} className="shop-more"><ProductGridSkeleton />
            <p><strong>{rendered.length}</strong> من {visible.length}</p>
            <button className="shop-more-button" onClick={showMore}>
              <span>عرض المزيد</span>
              <ArrowIcon />
            </button>
          </div>}
        </>
      : <div className="empty-collection">
          <span className="empty-mark" aria-hidden="true">✳</span>
          <h3>{unavailable ? 'تعذّر تحميل المنتجات حالياً.' : query ? 'لا توجد نتائج لهذا البحث.' : 'لا توجد منتجات حاليًا'}</h3>
          <p>{unavailable ? 'يرجى المحاولة مجدداً بعد قليل.' : 'ستظهر المنتجات هنا عند توفرها في المتجر.'}</p>
          <CategoryLink className="scene-button" slug={null}>جميع المنتجات</CategoryLink>
        </div>}
  </section>
}
