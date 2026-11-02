'use client'

import ProductImage from './ProductImage'
import Price from './Price'
import { useEffect, useRef, useState } from 'react'
import { BagIcon, CheckIcon, HeartIcon } from './icons'
import { discountPercent, formatJod } from '@/lib/format'
import type { Product } from '@/types/product'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: Product
  currency: string
  isFavorite: boolean
  selectedVariantId: string | null
  onSelectVariant: (productId: string, variantId: string) => void
  onToggleFavorite: (productId: string) => void
  onAddToCart: (productId: string, variantId: string | null) => void | boolean
  onOpenDetails: (productId: string) => void
}

export default function ProductCard({ product, currency, isFavorite, selectedVariantId, onSelectVariant, onToggleFavorite, onAddToCart, onOpenDetails }: ProductCardProps) {
  const variant = product.variants.find(item => item.id === selectedVariantId) ?? product.variants[0] ?? null
  const price = variant ? variant.price : product.price
  const discount = product.oldPrice && product.oldPrice > price ? discountPercent(price, product.oldPrice) ?? 0 : 0
  const soldOut = product.stockQuantity != null && product.stockQuantity <= 0
  const isNew = /^(new|جديد)$/i.test(product.badge?.trim() ?? '')
  const [added, setAdded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return <article className={styles.card} data-testid={`product-${product.slug}`} data-category={product.category}>
    <div className={styles.tile}>
      <button className={styles.imageButton} onClick={() => onOpenDetails(product.id)} aria-label={`عرض تفاصيل ${product.nameAr}`}>
        <ProductImage src={product.imageUrl} alt={product.nameAr} sizes="(max-width: 767px) 46vw, (max-width: 1199px) 30vw, 280px" />
      </button>

      {(discount > 0 || isNew) && <span className={styles.badge}>{discount > 0 ? <bdi dir="ltr">خصم {discount}%</bdi> : 'جديد'}</span>}

      <button className={styles.wishlist} aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} aria-pressed={isFavorite} onClick={() => onToggleFavorite(product.id)}>
        <HeartIcon />
      </button>
    </div>

    <div className={styles.details}>
      <div>
        <p className={styles.category}>{product.categoryLabel}</p>
        <h3 className={styles.title}><button onClick={() => onOpenDetails(product.id)}>{product.nameAr}</button></h3>
        <p className={styles.stock}>{soldOut ? 'نفدت الكمية' : product.stockQuantity != null ? `${product.stockQuantity} متوفر` : ''}</p>
      </div>

      <div className={styles.controls}>
        {product.variants.length > 1 && <label className={styles.variant}>النوع
          <select aria-label={`نوع ${product.nameAr}`} value={variant?.id ?? ''} onChange={event => { setAdded(false); onSelectVariant(product.id, event.target.value) }}>
            {product.variants.map(item => <option key={item.id} value={item.id}>{item.label} — {formatJod(item.price, currency)}</option>)}
          </select>
        </label>}
        <div className={styles.price} dir="ltr">
          <Price key={price} value={price} currency={currency} />
          {product.oldPrice && product.oldPrice > price && <del>{formatJod(product.oldPrice, currency)}</del>}
        </div>

        <button className={styles.add} disabled={soldOut || product.isActive === false} data-added={added} aria-label={soldOut ? `نفدت الكمية: ${product.nameAr}` : `أضف إلى السلة: ${product.nameAr}`} onClick={() => {
          if (onAddToCart(product.id, variant?.id ?? null) === false) return
          setAdded(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setAdded(false), 1600)
        }}>
          {added ? <CheckIcon /> : <BagIcon />}
          <span aria-live="polite">{soldOut ? 'نفدت الكمية' : added ? 'تمت الإضافة' : 'أضف إلى السلة'}</span>
        </button>
      </div>
    </div>
  </article>
}
