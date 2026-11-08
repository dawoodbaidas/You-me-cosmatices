'use client'

import {useRef,useState} from 'react'
import ProductMedia from './ProductMedia'
import {PRODUCT_IMAGE_SIZES} from '@/lib/product-media'
import {cartLineLimit,isProductOutOfStock} from '@/lib/cart'
import {productPricing} from '@/lib/pricing'
import Price from './Price'
import BoutiqueDialog from './BoutiqueDialog'
import {BagIcon,CheckIcon,CloseIcon,HeartIcon,WhatsappIcon} from './icons'
import {formatJod} from '@/lib/format'
import {whatsappLink} from '@/lib/whatsapp'
import {useAddFeedback} from './useAddFeedback'
import type {CartItem,Product,SiteSettings} from '@/types/product'
import styles from './ProductQuickView.module.css'

interface ProductQuickViewProps {
  product:Product|null;inline?:boolean;inventory?:boolean;cartItems?:CartItem[]
  selectedVariantId:string|null;onSelectVariant:(productId:string,variantId:string)=>void
  currency:string;isFavorite:boolean;settings:SiteSettings;onClose:()=>void
  onToggleFavorite:(productId:string)=>void
  onAddToCart:(product:Product,variantId:string|null,quantity:number)=>void|boolean|Promise<void|boolean>
}

export default function ProductQuickView({product,inline=false,inventory=true,cartItems=[],selectedVariantId,onSelectVariant,currency,isFavorite,settings,onClose,onToggleFavorite,onAddToCart}:ProductQuickViewProps) {
  const [expanded,setExpanded]=useState(false)
  const {pending,added,error,setError,run,reset}=useAddFeedback()
  const choices=useRef<HTMLDivElement>(null)
  if(!product)return null
  const variant=product.variants.find(item=>item.id===selectedVariantId)??(product.variants.length===1?product.variants[0]:null)
  const needsChoice=product.variants.length>1&&!variant
  const {price,oldPrice}=productPricing(product,variant)
  const soldOut=isProductOutOfStock(product)
  const quantity=cartItems.find(item=>item.productId===product.id&&item.variantId===(variant?.id??null))?.quantity??0
  const unavailable=soldOut||product.isActive===false||variant?.isActive===false||(!needsChoice&&inventory&&quantity>=cartLineLimit(product,cartItems,variant?.id??null))
  const buy=()=>{
    if(unavailable)return
    if(needsChoice){setError('اختر النوع أولًا.');choices.current?.querySelector('button')?.focus();return}
    void run(()=>onAddToCart(product,variant?.id??null,1))
  }
  const content=<div className={styles.sheet} data-testid="product-quickview" data-product-id={product.id} dir="rtl">
    <div className={styles.scroll}>
      <div className={styles.media}>
        <ProductMedia key={product.imageUrl} src={product.imageUrl} alt={product.nameAr} sizes={PRODUCT_IMAGE_SIZES.detail} eager/>
        {!inline&&<button type="button" className={styles.close} onClick={onClose} aria-label="إغلاق" data-dialog-autofocus><CloseIcon/></button>}
        <button type="button" className={styles.favorite} onClick={()=>onToggleFavorite(product.id)} aria-pressed={isFavorite} aria-label={isFavorite?'إزالة من المفضلة':'إضافة إلى المفضلة'}><HeartIcon/></button>
      </div>
      <div className={styles.info}>
        <p className={styles.category}>{product.categoryLabel}</p>
        <h2>{product.nameAr}</h2>
        <div className={styles.price}><Price value={price} oldPrice={oldPrice} currency={currency}/></div>
        {soldOut&&<p role="status" className={styles.stock}>نفد من المخزون</p>}
        {product.description&&<div className={styles.description}>
          <p className={!expanded&&product.description.length>170?styles.collapsed:undefined}>{product.description}</p>
          {product.description.length>170&&<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'عرض أقل':'قراءة المزيد'}</button>}
        </div>}
        {product.variants.length>1&&<div ref={choices} className={styles.variants} aria-label="اختر النوع">
          <p>اختر النوع</p>
          {product.variants.map(item=><button type="button" key={item.id} disabled={pending||item.isActive===false} aria-pressed={variant?.id===item.id} onClick={()=>{reset();onSelectVariant(product.id,item.id)}}><span>{item.label}</span><span dir="ltr">{formatJod(productPricing(product,item).price,currency)}</span></button>)}
        </div>}
      </div>
    </div>
    <div className={styles.purchase}>
      {error&&<p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.buy} onClick={buy} disabled={pending||unavailable} aria-busy={pending} data-testid="product-add">
          {added?<CheckIcon/>:<BagIcon/>}<span aria-live="polite">{soldOut?'نفد من المخزون':pending?'جارٍ الإضافة…':added?'تمت الإضافة':unavailable?'الكمية المتاحة في السلة':'أضف إلى السلة'}</span>
        </button>
        {settings.whatsappNumber&&<a className={styles.whatsapp} href={whatsappLink(settings.whatsappNumber,`مرحبًا، أود الاستفسار عن ${product.nameAr}`)} onClick={event=>{event.currentTarget.href=whatsappLink(settings.whatsappNumber,`مرحبًا، أود الاستفسار عن ${product.nameAr}\n${new URL('/products/'+encodeURIComponent(product.slug),location.origin).href}`)}} target="_blank" rel="noopener noreferrer" aria-label="اسأل عن هذا المنتج على واتساب"><WhatsappIcon/></a>}
      </div>
    </div>
  </div>
  return inline?<section className={styles.page}>{content}</section>:<BoutiqueDialog open onClose={onClose} label={product.nameAr} className={`product-details-dialog ${styles.dialog}`}>{content}</BoutiqueDialog>
}
