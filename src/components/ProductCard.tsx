'use client'

import { useEffect, useRef, useState } from 'react'
import { HeartIcon } from './icons'
import { formatJod } from '@/lib/format'
import type { Product } from '@/types/product'
import ProductLens from './ProductLens'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: Product
  currency: string
  eager: boolean
  quantity: number
  isFavorite: boolean
  selectedVariantId: string | null
  onSelectVariant: (productId: string, variantId: string) => void
  onToggleFavorite: (productId: string) => void
  onAddToCart: (productId: string, variantId: string | null) => void | boolean
  onOpenDetails: (productId: string) => void
}

export default function ProductCard({ product, currency, eager, quantity, isFavorite, selectedVariantId, onSelectVariant, onToggleFavorite, onAddToCart, onOpenDetails }: ProductCardProps) {
  const [added, setAdded] = useState(false)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const card = useRef<HTMLElement>(null)
  const animations = useRef<Animation[]>([])
  const flyers = useRef<HTMLElement[]>([])
  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    animations.current.forEach(animation => animation.cancel())
    flyers.current.forEach(element => element.remove())
  }, [])
  const variant = product.variants.find(item => item.id === selectedVariantId) ?? product.variants[0] ?? null
  const price = variant?.price ?? product.price
  const disabled = (product.stockQuantity != null && product.stockQuantity <= 0) || product.isActive === false || variant?.isActive === false
  const add = () => {
    if (onAddToCart(product.id, variant?.id ?? null) === false) return false
    setAdded(true)
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setAdded(false), 1200)
    return true
  }
  const addFromTag = () => {
    if (add() === false || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tag = card.current?.querySelector<HTMLElement>(`[data-price-tag]`)
    if (!tag) return
    animations.current.forEach(animation => animation.cancel())
    flyers.current.forEach(element => element.remove())
    animations.current = [tag.animate([{ transform: 'perspective(320px) rotateY(0deg)' }, { transform: 'perspective(320px) rotateY(360deg)' }], { duration: 700, easing: 'ease-in-out' })]
    flyers.current = []
    const image = card.current?.querySelector('img')
    const destination = Array.from(document.querySelectorAll<HTMLElement>('.mobile-shopping-bar, .header-bag')).find(element => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.top >= 0 && rect.bottom <= innerHeight
    })
    if (!image || !destination) return
    const from = tag.getBoundingClientRect(), to = destination.getBoundingClientRect()
    const flyer = document.createElement('img')
    flyer.src = image.currentSrc
    flyer.alt = ''
    flyer.setAttribute('aria-hidden', 'true')
    Object.assign(flyer.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: '48px', height: '60px', objectFit: 'cover', borderRadius: '10px', pointerEvents: 'none', zIndex: '9999' })
    document.body.append(flyer)
    flyers.current.push(flyer)
    const flight = flyer.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${to.left + to.width / 2 - from.left - 24}px,${to.top + to.height / 2 - from.top - 30}px) scale(.2)`, opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.3,.1,.6,1)' })
    animations.current.push(flight)
    flight.onfinish = () => flyer.remove()
  }
  return <article ref={card} dir="rtl" className={styles.card} data-testid={`product-${product.slug}`} data-category={product.category}>
    <div className={styles.visual}>
      <div className={styles.tile}>
        <ProductLens src={product.imageUrl} name={product.nameAr} eager={eager} onOpen={() => onOpenDetails(product.id)} />
        {product.badge && <span className={styles.badge}>{product.badge.toLowerCase() === 'new' ? 'جديد' : product.badge}</span>}
        <button className={styles.wishlist} aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} aria-pressed={isFavorite} onClick={() => onToggleFavorite(product.id)}><HeartIcon /></button>
      </div>
      <div className={styles.tagAnchor}><div className={styles.tagIdle}><button data-price-tag className={styles.tag} disabled={disabled} onClick={addFromTag} aria-label={`أضف قطعة من ${product.nameAr} إلى السلة بسعر ${formatJod(price, currency)}`}>
        <span className={styles.paper}><span className={styles.hole} /><strong>{new Intl.NumberFormat('ar-JO', { maximumFractionDigits: 2 }).format(price)}</strong><small>د.أ</small>{product.oldPrice != null && product.oldPrice > price && <del>{product.oldPrice}</del>}</span>
        {quantity > 0 && <span className={styles.count} data-n={quantity} aria-label={`${quantity} في السلة`} />}
      </button></div></div>
    </div>
    <div className={styles.details}>
      <div className={styles.info}>
        <p className={styles.category}>{variant?.label ?? product.categoryLabel}</p>
        <h3 className={styles.title}><button onClick={() => onOpenDetails(product.id)}>{product.nameAr}</button></h3>
        {product.variants.length > 1 && <label className={styles.variant}>النوع<select aria-label={`نوع ${product.nameAr}`} value={variant?.id ?? ''} onChange={e => onSelectVariant(product.id, e.target.value)}>{product.variants.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      </div>
      <button className={styles.add} disabled={disabled} onClick={add} aria-live="polite">{disabled ? 'غير متوفر' : added ? 'تمت الإضافة' : 'أضف للسلة'}</button>
    </div>
  </article>
}
