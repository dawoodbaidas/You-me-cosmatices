'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { BagIcon, HeartIcon } from './icons'
import { formatJod } from '@/lib/format'
import type { Product } from '@/types/product'
import ProductLens from './ProductLens'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: Product
  currency: string
  deferImage?: boolean
  eager: boolean
  quantity: number
  isFavorite: boolean
  selectedVariantId: string | null
  onSelectVariant: (productId: string, variantId: string) => void
  onToggleFavorite: (productId: string) => void
  onAddToCart: (productId: string, variantId: string | null) => void | boolean | Promise<void | boolean>
  onOpenDetails: (productId: string) => void
}

export default function ProductCard({ product, currency, eager, deferImage = false, quantity, isFavorite, selectedVariantId, onSelectVariant, onToggleFavorite, onAddToCart, onOpenDetails }: ProductCardProps) {
  const pathname = usePathname()
  const [added, setAdded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const adding = useRef(false)
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
  const add = async () => {
    if (adding.current || disabled) return false
    adding.current = true
    setPending(true)
    setError('')
    try {
      const result = await onAddToCart(product.id, variant?.id ?? null)
      if (result === false) throw new Error('Addition rejected')
      setAdded(true)
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => setAdded(false), 1200)
      return true
    } catch {
      setError('تعذّرت الإضافة. تحقّق من الكمية المتاحة وحاول مجددًا.')
      return false
    } finally {
      adding.current = false
      setPending(false)
    }
  }
  const addFromTag = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (quantity > 0) {
      if (onAddToCart(product.id, variant?.id ?? null) === false) return
    } else if (await add() === false) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
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
        <ProductLens src={product.imageUrl} name={product.nameAr} eager={eager} defer={deferImage} onOpen={() => onOpenDetails(product.id)} />
        {product.badge && <span className={styles.badge}>{product.badge.toLowerCase() === 'new' ? 'جديد' : product.badge}</span>}
        <button className={styles.wishlist} aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} aria-pressed={isFavorite} onClick={() => onToggleFavorite(product.id)}><HeartIcon /></button>
      </div>
      <div className={styles.tagAnchor}><div className={styles.tagIdle}><button data-price-tag className={styles.tag} disabled={disabled || pending} onClick={addFromTag} aria-label={`أضف قطعة من ${product.nameAr} إلى السلة بسعر ${formatJod(price, currency)}`}>
        <span className={styles.paper}><span className={styles.hole} /><strong>{new Intl.NumberFormat('ar-JO', { maximumFractionDigits: 2 }).format(price)}</strong><small>د.أ</small>{product.oldPrice != null && product.oldPrice > price && <del>{product.oldPrice}</del>}</span>
      </button></div>{quantity > 0 && <span className={styles.count}><span aria-hidden="true">{new Intl.NumberFormat('ar-JO').format(quantity)}</span><span className="sr-only"> عدد القطع في السلة {quantity}</span></span>}</div>
    </div>
    <div className={styles.details}>
      <div className={styles.info}>
        <p className={styles.category}>{variant?.label ?? product.categoryLabel}</p>
        <h3 className={styles.title}><Link onNavigate={event => { event.preventDefault(); onOpenDetails(product.id) }} href={"/products/" + encodeURIComponent(product.slug) + (pathname.startsWith("/category/") ? "?from=" + encodeURIComponent(decodeURIComponent(pathname.split("/")[2])) : "")}>{product.nameAr}</Link></h3>
        {product.variants.length > 1 && <label className={styles.variant}>النوع<select disabled={pending} aria-label={`نوع ${product.nameAr}`} value={variant?.id ?? ''} onChange={e => onSelectVariant(product.id, e.target.value)}>{product.variants.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      </div>
      <div className={styles.purchase}>
        <button className={styles.add} disabled={pending || quantity > 0 || disabled} aria-busy={pending} onClick={add} aria-live="polite">
          <BagIcon />{pending ? 'جارٍ الإضافة…' : quantity > 0 ? added ? 'تمت الإضافة ✓' : 'في السلة ✓' : disabled ? 'غير متوفر' : 'أضف إلى السلة'}
        </button>
        {error && <p className={styles.addError} role="alert">{error}</p>}
      </div>
    </div>
  </article>
}
