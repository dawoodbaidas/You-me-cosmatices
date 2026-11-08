'use client'

import Link from './StoreNavigation'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { BagIcon, CheckIcon, HeartIcon, WhatsappIcon } from './icons'
import { useAddFeedback } from './useAddFeedback'
import { whatsappLink } from '@/lib/whatsapp'
import { formatAmount, formatJod } from '@/lib/format'
import { productPricing } from '@/lib/pricing'
import { cartLineLimit, isProductOutOfStock } from '@/lib/cart'
import StockBadge from './StockBadge'
import type { Product } from '@/types/product'
import ProductLens from './ProductLens'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: Product
  currency: string
  whatsappNumber?: string
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

export default function ProductCard({ product, currency, whatsappNumber, eager, deferImage = false, quantity, isFavorite, selectedVariantId, onSelectVariant, onToggleFavorite, onAddToCart, onOpenDetails }: ProductCardProps) {
  const pathname = usePathname()
  const {added,pending,error,setError,run,reset}=useAddFeedback()
  const variantSelect=useRef<HTMLSelectElement>(null)
  const card = useRef<HTMLElement>(null)
  const animations = useRef<Animation[]>([])
  const flyers = useRef<HTMLElement[]>([])
  useEffect(() => () => {
    animations.current.forEach(animation => animation.cancel())
    flyers.current.forEach(element => element.remove())
  }, [])
  const variant = product.variants.find(item => item.id === selectedVariantId) ?? (product.variants.length===1?product.variants[0]:null)
  const needsChoice=product.variants.length>1&&!variant
  const { price, oldPrice, discount } = productPricing(product, variant)
  const soldOut = isProductOutOfStock(product)
  const disabled = soldOut || product.isActive===false || (!needsChoice && quantity >= cartLineLimit(product, [], variant?.id ?? null))
  const add = async () => {
    if(disabled)return false
    if(needsChoice){setError('اختر النوع أولًا.');variantSelect.current?.focus();return false}
    return run(()=>onAddToCart(product.id,variant?.id??null))
  }
  const addFromTag = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (await add() === false) return
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
        {soldOut && <StockBadge overlay />}
        {(discount || product.isNew) && <span className={styles.badge}>{discount ? `-${discount}%` : 'جديد'}</span>}
        <button className={styles.wishlist} aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} aria-pressed={isFavorite} onClick={() => onToggleFavorite(product.id)}><HeartIcon /></button>
      </div>
      <div className={styles.tagAnchor}><div className={styles.tagIdle}><button data-price-tag className={styles.tag} disabled={disabled || pending} onClick={addFromTag} aria-label={`أضف قطعة من ${product.nameAr} إلى السلة بسعر ${formatJod(price, currency)}`}>
        <span className={styles.paper}><span className={styles.hole} /><strong dir="ltr">{formatAmount(price)}</strong><small>{currency.toUpperCase() === 'JOD' ? 'د.أ' : currency}</small>{oldPrice != null && <del dir="ltr">{formatAmount(oldPrice)}</del>}</span>
      </button></div></div>
    </div>
    <div className={styles.details}>
      <div className={styles.info}>
        <h3 className={styles.title}><Link prefetch={false} onNavigate={event => { event.preventDefault(); onOpenDetails(product.id) }} href={"/products/" + encodeURIComponent(product.slug) + (pathname.startsWith("/category/") ? "?from=" + encodeURIComponent(decodeURIComponent(pathname.split("/")[2])) : "")}>{product.nameAr}</Link></h3>
        <p className={styles.category}>{variant?.label ?? product.categoryLabel}{discount && product.isNew && <span className={styles.newBadge}>جديد</span>}</p>
        {product.variants.length > 1 && <label className={styles.variant}>النوع<select ref={variantSelect} disabled={pending} aria-label={`نوع ${product.nameAr}`} value={variant?.id ?? ''} onChange={e => {reset();onSelectVariant(product.id, e.target.value)}}><option value="" disabled>اختر النوع</option>{product.variants.map(item => <option key={item.id} value={item.id} disabled={item.isActive===false}>{item.label}</option>)}</select></label>}
      </div>
      <div className={styles.purchase}>
        <button className={styles.add} disabled={pending || disabled} aria-busy={pending} onClick={add} aria-live="polite">
          {added?<CheckIcon/>:<BagIcon />}<span>{soldOut ? 'نفد من المخزون' : pending ? 'جارٍ الإضافة…' : added ? 'تمت الإضافة' : disabled ? 'غير متوفر' : 'أضف إلى السلة'}</span>
        </button>
        {whatsappNumber&&<a className={styles.whatsapp} href={whatsappLink(whatsappNumber,`مرحبًا، أود الاستفسار عن ${product.nameAr}`)} onClick={event=>{event.currentTarget.href=whatsappLink(whatsappNumber,`مرحبًا، أود الاستفسار عن ${product.nameAr}\n${new URL('/products/'+encodeURIComponent(product.slug),location.origin).href}`)}} target="_blank" rel="noopener noreferrer" aria-label={`اسأل عن ${product.nameAr} على واتساب`}><WhatsappIcon/></a>}
        {error && <p className={styles.addError} role="alert">{error}</p>}
      </div>
    </div>
  </article>
}
