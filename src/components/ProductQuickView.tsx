'use client'

import { useEffect, useRef, useState } from 'react'
import ProductMedia from './ProductMedia'
import './product-quickview.css'
import { cartLineLimit } from '@/lib/cart'
import { productPricing } from '@/lib/pricing'
import Price from './Price'
import BoutiqueDialog from './BoutiqueDialog'
import { BagIcon, CheckIcon, CloseIcon, HeartIcon, WhatsappIcon } from '@/components/icons'
import { formatJod } from '@/lib/format'
import { whatsappLink } from '@/lib/whatsapp'
import type { CartItem, Product, SiteSettings } from '@/types/product'

interface ProductQuickViewProps {
  product: Product | null
  inline?: boolean
  inventory?: boolean
  cartItems?: CartItem[]
  selectedVariantId: string | null
  onSelectVariant: (productId: string, variantId: string) => void
  currency: string
  isFavorite: boolean
  settings: SiteSettings
  onClose: () => void
  onToggleFavorite: (productId: string) => void
  onAddToCart: (product: Product, variantId: string | null, quantity: number) => void | boolean
}

export default function ProductQuickView({
  product,
  inventory = true,
  inline = false,
  cartItems = [],
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
  const [added, setAdded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  if (!product) return null

  const defaultVariant = product.variants.find(variant => variant.id === selectedVariantId) ?? product.variants[0] ?? null
  const { price: unitPrice, oldPrice, discount } = productPricing(product, defaultVariant)
  const variantId = defaultVariant?.id ?? null
  const existingQuantity = cartItems.find(item => item.productId === product.id && item.variantId === variantId)?.quantity ?? 0
  const soldOut = inventory && product.stockQuantity != null && product.stockQuantity <= 0
  const unavailable = product.isActive === false || defaultVariant?.isActive === false || (inventory && existingQuantity >= cartLineLimit(product, cartItems, variantId))

  const buy = () => {
    if (unavailable || onAddToCart(product, defaultVariant?.id ?? null, 1) === false) return
    if (!inventory) { onClose(); return }
    setAdded(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setAdded(false), 1600)
  }

  const content = (<>
      <div data-testid="product-quickview" className="quickview-sheet premium-quickview" dir="rtl">
        {!inline && <header className="quickview-toolbar"><span>?????? ??????</span><button type="button" onClick={onClose} aria-label="إغلاق" data-dialog-autofocus className="quickview-close">
          <CloseIcon />
        </button></header>}

        <div className="quickview-body">
        <div className="quickview-media">
          <ProductMedia key={product.imageUrl} src={product.imageUrl} alt={product.nameAr} sizes="(max-width: 767px) 90vw, 440px" eager />
          {(discount || product.isNew) && <span className="quickview-badge">{discount ? `-${discount}%` : 'جديد'}</span>}
        </div>

        <div className="quickview-info">
          <p className="scene-label">{product.categoryLabel}{discount && product.isNew && <span className="quickview-badge-inline"> جديد</span>}</p>
          <h3>{product.nameAr}</h3>
          {inventory && product.stockQuantity != null && <p className="quickview-en">{soldOut ? 'نفدت الكمية' : `${product.stockQuantity} متوفر`}</p>}
          {!inventory && <p className="quickview-en">مختار بعناية لك</p>}

          <div className="quickview-price">
            <Price value={unitPrice} currency={currency} />
            {oldPrice != null && <>
              <del dir="ltr">{formatJod(oldPrice!, currency)}</del>
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
                <button type="button" disabled={variant.isActive === false} aria-pressed={defaultVariant?.id === variant.id} onClick={() => { setAdded(false); onSelectVariant(product.id, variant.id) }}>
                  <span>{variant.label}</span>
                  <span dir="ltr">{formatJod(productPricing(product, variant).price, currency)}</span>
                </button>
              </li>)}
            </ul>
          </div>}

        </div>
        </div>
        <div className="quickview-purchase">
          <div className="quickview-actions">
            <button type="button" onClick={buy} disabled={unavailable} data-added={inventory && added} className="quickview-buy">
              {inventory && added ? <CheckIcon /> : <BagIcon />}
              <span aria-live="polite">{!inventory ? 'أضف للسلة' : soldOut ? 'نفدت الكمية' : unavailable ? 'الكمية المتاحة في السلة' : existingQuantity > 0 ? 'في السلة ✓' : added ? 'تمت الإضافة ✓' : 'أضف إلى السلة'}</span>
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

            {settings.whatsappNumber && <a
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
            </a>}
          </div>

          <p className="quickview-note">{inventory ? settings.storeAnnouncement : 'توصيل لكل الأردن · الدفع عند الاستلام'}</p>
        </div>
      </div>
    </>
  )
  return inline ? <section className="store-product-page">{content}</section> : <BoutiqueDialog open onClose={onClose} label={product.nameAr} className="quickview-dialog">{content}</BoutiqueDialog>
}
