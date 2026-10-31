'use client'
import Image from 'next/image'
import { useRef } from 'react'
import BoutiqueDialog from './BoutiqueDialog'
import { BagIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from './icons'
import { formatJod } from '@/lib/format'
import { cartCount, cartTotal } from '@/lib/cart'
import type { CartLine, SiteSettings } from '@/types/product'

export const FREE_SHIPPING_THRESHOLD = 30
export const SHIPPING_FEE = 2.5
export default function CartDrawer({ open, lines, settings, onClose, onIncrement, onDecrement, onRemove, onCheckout, onBrowse }: {
 open:boolean; lines:CartLine[]; settings:SiteSettings; onClose:()=>void; onIncrement:(id:string,variant:string|null)=>void; onDecrement:(id:string,variant:string|null)=>void; onRemove:(id:string,variant:string|null)=>void; onCheckout:()=>void; onBrowse:()=>void
}) {
 const subtotal=cartTotal(lines), count=cartCount(lines), remaining=Math.max(0,FREE_SHIPPING_THRESHOLD-subtotal)
 const shipping=remaining>0?SHIPPING_FEE:0
 const lastCheckout=useRef(0)
 return <BoutiqueDialog open={open} onClose={onClose} label="سلة التسوق" className="cart-dialog">
  <div className="cart-sheet" data-testid="cart-drawer" dir="rtl"><div className="cart-handle" aria-hidden="true"/>
   <div className="cart-heading"><h2>سلة التسوق <span>({count})</span></h2><button className="icon-button" aria-label="إغلاق السلة" onClick={onClose}><CloseIcon/></button></div>
   <div className="cart-content">{!lines.length?<div className="cart-empty"><span className="empty-bag"><BagIcon/></span><h3>سلتك فاضية، ابدأ بإضافة منتج</h3><button className="scene-button" onClick={onBrowse}>تسوّق الآن</button></div>:<ul>{lines.map(line=><li className="cart-line" key={`${line.product.id}-${line.variant?.id??'base'}`}>
    <div className="cart-thumbnail">{line.product.imageUrl?<Image src={line.product.imageUrl} alt={line.product.nameAr} fill sizes="90px"/>:<BagIcon/>}</div>
    <div className="cart-line-info"><div className="cart-line-top"><div><h3>{line.product.nameAr}</h3>{line.variant&&<p>{line.variant.label}</p>}<small dir="ltr">{formatJod(line.unitPrice,settings.currency)}</small></div><button className="cart-remove" aria-label={`حذف ${line.product.nameAr}`} onClick={()=>onRemove(line.product.id,line.variant?.id??null)}><TrashIcon/></button></div>
    <div className="cart-line-controls"><div className="quantity-stepper"><button aria-label="تقليل الكمية" onClick={()=>onDecrement(line.product.id,line.variant?.id??null)}><MinusIcon/></button><span>{line.quantity}</span><button aria-label="زيادة الكمية" onClick={()=>onIncrement(line.product.id,line.variant?.id??null)}><PlusIcon/></button></div><strong dir="ltr">{formatJod(line.lineTotal,settings.currency)}</strong></div></div>
   </li>)}</ul>}</div>
   {lines.length>0&&<div className="cart-summary"><div className="shipping-meter"><p>{remaining>0?`ضيف ${formatJod(remaining,settings.currency)} للحصول على توصيل مجاني`:'توصيلك مجاني'}</p><div className="shipping-meter-track" role="progressbar" aria-label="التوصيل المجاني" aria-valuemin={0} aria-valuemax={FREE_SHIPPING_THRESHOLD} aria-valuenow={Math.min(subtotal,FREE_SHIPPING_THRESHOLD)}><i style={{width:`${Math.min(100,subtotal/FREE_SHIPPING_THRESHOLD*100)}%`}}/></div></div>
    <div className="cart-subtotal"><span>المجموع الفرعي</span><span dir="ltr">{formatJod(subtotal,settings.currency)}</span></div><div className="cart-subtotal"><span>التوصيل</span><span dir="ltr">{shipping?formatJod(shipping,settings.currency):'مجاني'}</span></div><div className="cart-total"><span>الإجمالي</span><strong dir="ltr">{formatJod(subtotal+shipping,settings.currency)}</strong></div>
    <button className="cart-checkout" onClick={()=>{const now=Date.now();if(now-lastCheckout.current<2000)return;lastCheckout.current=now;onCheckout()}}>إتمام الطلب · دفع عند الاستلام</button><p className="cart-checkout-note">لا حاجة لبطاقة، بتدفع لما يوصلك الطلب</p><p className="cart-checkout-note">رسالة واتساب تعرض مجموع المنتجات؛ تضاف رسوم التوصيل عند تأكيد الطلب.</p>
   </div>}
  </div>
 </BoutiqueDialog>
}
