'use client'
import Price from './Price'
import { productPricing } from '@/lib/pricing'
import ProductImage from './ProductImage'
import { useRef } from 'react'
import BoutiqueDialog from './BoutiqueDialog'
import { BagIcon, CloseIcon, TrashIcon } from './icons'
import { formatJod } from '@/lib/format'
import { cartShipping, cartLineLimit, canCheckoutCart, cartCount, cartTotal } from '@/lib/cart'
import type { CartLine, SiteSettings } from '@/types/product'

export default function CartDrawer({ side, open, lines, settings, onClose, onRemove, onIncrement, onDecrement, onCheckout, onBrowse }: {
 side: 'left' | 'right'; open:boolean; lines:CartLine[]; settings:SiteSettings; onClose:()=>void; onRemove:(id:string,variant:string|null)=>void; onIncrement:(id:string,variant:string|null)=>void; onDecrement:(id:string,variant:string|null)=>void; onCheckout:()=>void; onBrowse:()=>void
}) {
 const subtotal=cartTotal(lines), count=cartCount(lines), threshold=settings.storeFreeShippingThreshold, remaining=Math.max(0,threshold-subtotal)
 const shipping=cartShipping(subtotal,settings)
 const orderAvailable=canCheckoutCart(lines)
 const items=lines.map(line=>({productId:line.product.id,variantId:line.variant?.id??null,quantity:line.quantity}))
 const lastCheckout=useRef(0)
 const content = <>
  <div className="cart-sheet" data-testid="cart-drawer" dir="rtl"><div className="cart-handle" aria-hidden="true"/>
    <div className="cart-heading"><h2>سلة التسوق <span>({count})</span></h2><button className="icon-button" aria-label="إغلاق السلة" onClick={onClose}><CloseIcon/></button></div>
   <div className="cart-content">{!lines.length?<div className="cart-empty"><span className="empty-bag"><BagIcon/></span><h3>سلتك فاضية، ابدأ بإضافة منتج</h3><button className="scene-button" onClick={onBrowse}>تسوّق الآن</button></div>:<ul>{lines.map(line=><li className="cart-line" key={`${line.product.id}-${line.variant?.id??'base'}`}>
    <div className="cart-thumbnail">{line.product.imageUrl?<ProductImage src={line.product.imageUrl} alt={line.product.nameAr} sizes="72px" eager/>:<BagIcon/>}</div>
    <div className="cart-line-info"><div className="cart-line-top"><div><h3>{line.product.nameAr}</h3>{line.variant&&<p>{line.variant.label}</p>}<small className="cart-unit-price">سعر الوحدة: <Price value={line.unitPrice} oldPrice={productPricing(line.product,line.variant).oldPrice} currency={settings.currency}/></small></div><button className="cart-remove" aria-label={`حذف ${line.product.nameAr}`} onClick={()=>onRemove(line.product.id,line.variant?.id??null)}><TrashIcon/></button></div>
    <div className="cart-line-controls"><span className="cart-quantity" role="group" aria-label={`كمية ${line.product.nameAr}`}><span className="quantity-stepper">
      <button aria-label={`زيادة كمية ${line.product.nameAr}`} onClick={()=>onIncrement(line.product.id,line.variant?.id??null)} disabled={line.quantity>=cartLineLimit(line.product,items,line.variant?.id??null)}>+</button>
      <span>{line.quantity}</span>
      <button aria-label={`خفض كمية ${line.product.nameAr}`} onClick={()=>onDecrement(line.product.id,line.variant?.id??null)} disabled={line.quantity<=1}>−</button>
    </span></span><div className="cart-line-total"><small>إجمالي المنتج</small><strong><bdi>{formatJod(line.lineTotal,settings.currency)}</bdi></strong></div></div></div>
   <p className="cart-stock-note" role="status">{line.quantity>=cartLineLimit(line.product,items,line.variant?.id??null) ? (cartLineLimit(line.product,items,line.variant?.id??null)===0 ? "??? ???? ?????? ? ???? ???? ????????" : "?? ???? ?????? ???????") : null}</p></li>)}</ul>}</div>
   {lines.length>0&&<div className="cart-summary">{threshold>0&&<div className="shipping-meter"><p>{remaining>0?`ضيف ${formatJod(remaining,settings.currency)} للحصول على توصيل مجاني`:'توصيلك مجاني'}</p><div className="shipping-meter-track" role="progressbar" aria-label="التوصيل المجاني" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(subtotal,threshold)}><i style={{width:`${Math.min(100,subtotal/threshold*100)}%`}}/></div></div>}
    <div className="cart-subtotal"><span>المجموع الفرعي</span><span dir="ltr">{formatJod(subtotal,settings.currency)}</span></div><div className="cart-subtotal"><span>التوصيل</span><span dir="ltr">{shipping === undefined ? 'يحدد عند التأكيد' : shipping ? formatJod(shipping,settings.currency) : 'مجاني'}</span></div><div className="cart-total"><span>{shipping === undefined ? 'مجموع المنتجات' : 'الإجمالي'}</span><strong dir="ltr">{formatJod(subtotal+(shipping??0),settings.currency)}</strong></div>
    <button className="cart-checkout" disabled={!orderAvailable} onClick={()=>{const now=Date.now();if(now-lastCheckout.current<2000)return;lastCheckout.current=now;onCheckout()}}>إتمام الطلب · دفع عند الاستلام</button>{!orderAvailable&&<p role="status" className="cart-checkout-note">راجع الكميات غير المتاحة قبل إتمام الطلب.</p>}<p className="cart-checkout-note">لا حاجة لبطاقة، بتدفع لما يوصلك الطلب</p><p className="cart-checkout-note">تُرسل تفاصيل المنتجات والتوصيل عبر واتساب؛ الرسوم غير المحددة تُحدد عند تأكيد الطلب.</p>
   </div>}
  </div>
 </>
  return <BoutiqueDialog open={open} onClose={onClose} label="سلة التسوق" className="cart-dialog" side={side}>{content}</BoutiqueDialog>
}
