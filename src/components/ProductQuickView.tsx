'use client'

import { useState } from 'react'
import ProductImage from './ProductImage'
import BoutiqueDialog from './BoutiqueDialog'
import { BagIcon, CloseIcon, HeartIcon, WhatsappIcon } from '@/components/icons'
import { discountPercent, formatJod } from '@/lib/format'
import { whatsappLink } from '@/lib/whatsapp'
import type { Product, SiteSettings } from '@/types/product'

interface ProductQuickViewProps {
  product: Product | null
  selectedVariantId: string | null
  onSelectVariant: (productId: string, variantId: string) => void
  currency: string
  isFavorite: boolean
  settings: SiteSettings
  onClose: () => void
  onToggleFavorite: (productId: string) => void
  onAddToCart: (product: Product, variantId: string | null, quantity: number) => void
}

export default function ProductQuickView({
  product,
  currency,
  selectedVariantId,
  onSelectVariant,
  isFavorite,
  settings,
  onClose,
  onToggleFavorite,
  onAddToCart,
}: ProductQuickViewProps) {
  const [expanded, setExpanded] = useState(false)
  const [quantity, setQuantity] = useState(1)
  if (!product) return null

  const defaultVariant = product.variants.find(variant => variant.id === selectedVariantId) ?? product.variants[0] ?? null
  const unitPrice = defaultVariant ? defaultVariant.price : product.price
  const discount = discountPercent(unitPrice, product.oldPrice)

  const buy = () => {
    onAddToCart(product, defaultVariant?.id ?? null, quantity)
    onClose()
  }

  return (
    <BoutiqueDialog open onClose={onClose} label={product.nameAr} className="quickview-dialog">
      <div data-testid="product-quickview" className="quickview-sheet">
        <button type="button" onClick={onClose} aria-label="إغلاق" className="quickview-close">
          <CloseIcon />
        </button>

        <div className="quickview-body">
        <div className="quickview-media">
          <ProductImage key={product.imageUrl} src={product.imageUrl} alt={product.nameAr} sizes="(max-width: 767px) 90vw, 440px" eager />
          <span className="quickview-media-index" dir="ltr">Y&amp;M / THE EDIT</span>
          {product.badge && <span className="quickview-badge">{product.badge}</span>}
        </div>

        <div className="quickview-info">
          <p className="scene-label">{product.categoryLabel}</p>
          <h3>{product.nameAr}</h3>
          <p className="quickview-en" dir="auto">{product.nameEn}</p>

          <div className="quickview-price">
            <strong dir="ltr">{formatJod(unitPrice, currency)}</strong>
            {product.oldPrice && product.oldPrice > unitPrice && <>
              <del dir="ltr">{formatJod(product.oldPrice, currency)}</del>
              {discount && <span dir="ltr">-{discount}%</span>}
            </>}
          </div>

          {product.description && <div className="quickview-description"><p className={expanded ? "" : "is-collapsed"}>{product.description}</p><button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "عرض أقل" : "قراءة المزيد"}</button></div>}

          {product.benefits.length > 0 && <ul className="quickview-benefits">
            {product.benefits.map((benefit, index) => <li key={`${benefit}-${index}`}>{benefit}</li>)}
          </ul>}

          {product.variants.length > 0 && <div className="quickview-variants">
            <div className="quickview-variants-label">الأنواع المتاحة ({product.variants.length})</div>
            <ul>
              {product.variants.map(variant => <li key={variant.id}>
                <button type="button" aria-pressed={defaultVariant?.id === variant.id} onClick={() => onSelectVariant(product.id, variant.id)}>
                  <span>{variant.label}</span>
                  <span dir="ltr">{formatJod(variant.price, currency)}</span>
                </button>
              </li>)}
            </ul>
          </div>}

        </div>
        </div>
        <div className="quickview-purchase">
          <div className="quantity-stepper"><button aria-label="تقليل الكمية" disabled={quantity === 1} onClick={() => setQuantity(q => q - 1)}>−</button><span aria-live="polite">{quantity}</span><button aria-label="زيادة الكمية" disabled={quantity === 99} onClick={() => setQuantity(q => q + 1)}>+</button></div>
          <div className="quickview-actions">
            <button type="button" onClick={buy} className="quickview-buy">
              <BagIcon />
              أضف للسلة
            </button>

            <button
              type="button"
              onClick={() => onToggleFavorite(product.id)}
              aria-pressed={isFavorite}
              aria-label="المفضلة"
              className="quickview-icon-button"
            >
              <HeartIcon className={isFavorite ? 'is-favorite' : ''} />
            </button>

            <a
              href={whatsappLink(
                settings.whatsappNumber,
                `${settings.whatsappMessage}\n${product.nameAr} — ${formatJod(unitPrice, settings.currency)}`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="اسأل عن هذا المنتج على واتساب"
              className="quickview-icon-button is-whatsapp"
            >
              <WhatsappIcon />
            </a>
          </div>

          <p className="quickview-note">توصيل لكل الأردن · الدفع عند الاستلام</p>
        </div>
      </div>
    </BoutiqueDialog>
  )
}
