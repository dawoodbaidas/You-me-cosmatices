'use client'

import ProductImage from './ProductImage'
import { useEffect, useRef, useState } from 'react'
import { BagIcon, CheckIcon, HeartIcon, ArrowIcon } from './icons'
import { discountPercent, formatJod } from '@/lib/format'
import type { Product } from '@/types/product'

interface ProductCardProps {
  product: Product
  currency: string
  isFavorite: boolean
  selectedVariantId: string | null
  onSelectVariant: (productId: string, variantId: string) => void
  onToggleFavorite: (productId: string) => void
  onAddToCart: (productId: string, variantId: string | null) => void
  onOpenDetails: (productId: string) => void
}

export default function ProductCard({ product, currency, isFavorite, selectedVariantId, onToggleFavorite, onAddToCart, onOpenDetails }: ProductCardProps) {
  const variant = product.variants.find(item => item.id === selectedVariantId) ?? product.variants[0] ?? null
  const price = variant ? variant.price : product.price
  const discount = discountPercent(price, product.oldPrice)
  const [added, setAdded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return <article className="beauty-object" data-testid={`product-${product.slug}`} data-category={product.category}>
    <div className="object-canvas">
      <button className="object-frame" onClick={() => onOpenDetails(product.id)} aria-label={`عرض تفاصيل ${product.nameAr}`}>
        <div className="object-frame-inner">
          {product.imageUrl
            ? <ProductImage src={product.imageUrl} alt={product.nameAr} sizes="(max-width: 767px) 46vw, (max-width: 1023px) 30vw, 23vw" />
            : <span className="object-placeholder"><BagIcon /><span dir="ltr">YOU &amp; ME</span></span>}
        </div>
      </button>

      <div className="object-indicators">
        {product.badge && <span className="object-indicator-badge">{product.badge}</span>}
        {discount && <span className="object-indicator-discount" dir="ltr">-{discount}%</span>}
      </div>

      <button className="object-wishlist" aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} aria-pressed={isFavorite} onClick={() => onToggleFavorite(product.id)}>
        <HeartIcon className={isFavorite ? 'is-favorite' : ''} />
      </button>

      <button className="object-quick-action" onClick={() => onOpenDetails(product.id)} aria-label={`نظرة سريعة على ${product.nameAr}`}>
        اكتشفي <ArrowIcon />
      </button>
    </div>

    <div className="object-details-v2">
      <div className="object-header-v2">
        <span className="object-type-v2">{product.categoryLabel}</span>
        <h3 className="object-title-v2"><button onClick={() => onOpenDetails(product.id)}>{product.nameAr}</button></h3>
        <p className="object-subtitle-v2" dir="auto">{product.nameEn || 'Premium Collection'}</p>
      </div>

      <div className="object-controls-v2">
        <div className="object-price-v2" dir="ltr">
          <strong key={price}>{formatJod(price, currency)}</strong>
          {product.oldPrice && product.oldPrice > price && <del>{formatJod(product.oldPrice, currency)}</del>}
        </div>

        <button className={`object-cart-v2 ${added ? 'is-added' : ''}`} aria-label={`أضف للسلة: ${product.nameAr}`} onClick={() => {
          onAddToCart(product.id, variant?.id ?? null)
          setAdded(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setAdded(false), 1600)
        }}>
          {added ? <CheckIcon /> : <BagIcon />}
          <span>{added ? 'تم' : 'أضف للسلة'}</span>
        </button>
      </div>
    </div>
  </article>
}
