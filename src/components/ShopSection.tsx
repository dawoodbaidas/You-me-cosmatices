'use client'

import { useEffect, useMemo, useState } from 'react'
import { CATEGORY_FILTERS } from '@/lib/categories'
import type { CategoryFilter, Product } from '@/types/product'
import ProductCard from './ProductCard'
import { ArrowIcon, CloseIcon } from './icons'
import type { Collection } from '@/lib/taxonomy'

const INITIAL_VISIBLE = 12

interface ShopSectionProps {
  products: Product[]
  currency: string
  activeFilter: CategoryFilter
  onFilterChange: (filter: CategoryFilter) => void
  collection?: Collection
  groups: Collection[]
  onCollectionChange: (id: string | null) => void
  favorites: string[]
  selectedVariants: Record<string, string>
  onSelectVariant: (productId: string, variantId: string) => void
  onToggleFavorite: (productId: string) => void
  onAddToCart: (productId: string, variantId: string | null) => void
  onOpenDetails: (productId: string) => void
}

export default function ShopSection({ products, currency, activeFilter, onFilterChange, collection, groups, onCollectionChange, favorites, selectedVariants, onSelectVariant, onToggleFavorite, onAddToCart, onOpenDetails }: ShopSectionProps) {
  const [query, setQuery] = useState('')
  const [pagination, setPagination] = useState({ key: '', count: INITIAL_VISIBLE })
  const viewKey = `${collection?.id ?? activeFilter}:${query}`

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('ar')
    return term
      ? products.filter(product => [product.nameAr, product.nameEn, product.categoryLabel, product.description ?? '', ...product.variants.map(v=>v.label)].some(value => value.toLocaleLowerCase('ar').includes(term)))
      : products
  }, [query, products])

  const visibleCount = pagination.key === viewKey ? pagination.count : INITIAL_VISIBLE
  const rendered = visible.slice(0, visibleCount)
  const favoriteSet = new Set(favorites)

  useEffect(() => {
    window.dispatchEvent(new Event('boutique:layout'))
  }, [activeFilter, query, visibleCount])

  const showMore = () => {
    setPagination({ key: viewKey, count: visibleCount + INITIAL_VISIBLE })
  }

  return <section id="shop" className="beauty-shop">
    <nav className="shop-breadcrumb" aria-label="مسار التسوق"><button onClick={()=>{setQuery('');onCollectionChange(null);onFilterChange('all')}}>المتجر</button>{collection && <> / {groups.find(g=>g.children.some(c=>c.id===collection.id)) && <><button onClick={()=>onCollectionChange(groups.find(g=>g.children.some(c=>c.id===collection.id))!.id)}>{groups.find(g=>g.children.some(c=>c.id===collection.id))!.label}</button> / </>}<span>{collection.label}</span><button className="clear-collection" onClick={()=>{setQuery('');onCollectionChange(null);onFilterChange('all')}}>مسح التصفية ×</button></>}</nav>
    {collection && <div className="collection-heading"><h2>{collection.label}</h2><span>{products.length} منتج</span></div>}
    {collection && <div className="collection-children">{(groups.find(g=>g.id===collection.id)?.children ?? []).map(child=><button key={child.id} onClick={()=>{setQuery('');onCollectionChange(child.id)}}>{child.label} <small>{child.productIds.length}</small></button>)}</div>}
    <div className="scene-heading shop-heading">
      <div>
        <p className="scene-label">المجموعة</p>
        <h2>اكتشف <em>مجموعتنا.</em></h2>
        <p className="shop-intro">كل ما تبحث عنه، بتفاصيل أقرب لذوقك.</p>
      </div>
      <span className="shop-english" dir="ltr">The full<br /><i>edit.</i></span>
    </div>

    <div className="shop-tools">
      <label className="catalog-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg>
        <span className="sr-only">ابحث في المجموعة</span>
        <input id="catalog-search" value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="ابحث عن منتج، فئة، أو تفصيل" />
        {query && <button onClick={() => setQuery('')} aria-label="مسح البحث"><CloseIcon /></button>}
      </label>
      <span className="shop-count" role="status">{visible.length} منتج</span>
    </div>

    <div className="category-tabs" role="group" aria-label="تصفية حسب الفئة">
      {CATEGORY_FILTERS.map(option => <button
        key={option.key}
        data-testid={`filter-${option.key}`}
        aria-pressed={activeFilter === option.key}
        onClick={() => { setQuery(''); onFilterChange(option.key) }}
      >{option.label}</button>)}
    </div>

    {visible.length
      ? <>
          <div className="product-grid" key={activeFilter}>
            {rendered.map(product => <ProductCard
              key={product.id}
              product={product}
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
          <h3>لم نجد هذا الاختيار.</h3>
          <p>جرّب اسماً آخر أو اكتشف المجموعة كاملة.</p>
          <button className="scene-button" onClick={() => { setQuery(''); onFilterChange('all') }}>عرض جميع المنتجات</button>
        </div>}
  </section>
}
