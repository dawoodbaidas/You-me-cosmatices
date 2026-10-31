'use client'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { selectHeroProducts } from '@/lib/taxonomy'
import type { Product } from '@/types/product'

export default function MobileHero({ products, onScrollTo, onOpenDetails }: { products:Product[]; currency:string; onScrollTo:(id:string)=>void; onAddToCart:(id:string,variant:string|null)=>void; onOpenDetails:(id:string)=>void }) {
 const root=useRef<HTMLDivElement>(null)
 const featured=selectHeroProducts(products)
 const central=featured[0]
 const items=featured.slice(1)
 useEffect(()=>{
  const element=root.current, section=element?.closest<HTMLElement>('#home');if(!element||!section)return
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0
  const cards=Array.from(element.querySelectorAll<HTMLElement>('.editorial-small'))
  const central=element.querySelector<HTMLElement>('.editorial-central'), title=element.querySelector<HTMLElement>('.editorial-title'), actions=element.querySelector<HTMLElement>('.editorial-actions'), word=element.querySelector<HTMLElement>('.editorial-word'),hint=element.querySelector<HTMLElement>('.hero-scroll-hint')
  const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t)}
  const draw=()=>{frame=0;const progress=reduced.matches?0:Math.max(0,Math.min(1,-section.getBoundingClientRect().top/Math.max(1,section.offsetHeight-innerHeight)))
   const exit=reduced.matches?0:ease((progress-.72)/.28)
   cards.forEach(card=>{const index=Number(card.dataset.index),dir=index%2===0?-1:1,enter=reduced.matches?1:ease((progress-index*.035)/.13),leave=reduced.matches?0:ease((progress-.72-index*.025)/(.28-index*.025));card.style.transform=`perspective(700px) translate3d(${dir*(90*(1-enter)+65*leave)}px,${24*(1-enter)-18*leave}px,${-80*(1-enter)-45*leave}px) rotateY(${dir*(-28*(1-enter)+16*leave)}deg) rotate(${dir*(-8*(1-enter)+6*leave)}deg) scale(${.82+.18*enter-.12*leave})`;card.style.opacity=String(reduced.matches?1:(.18+.82*enter)*(1-.85*leave));card.style.pointerEvents='auto';card.tabIndex=0})
   if(central)central.style.transform=`translateY(${46*exit}px) scale(${1+.45*exit})`
   if(title){title.style.transform=`translateY(${-35*exit}px)`;title.style.opacity=String(1-exit)}
   if(actions){actions.style.transform=`translateY(${30*exit}px)`;actions.style.opacity=String(1-exit)}
   if(word)word.style.transform=`translateX(${-100*progress}px)`
   if(hint)hint.style.opacity=progress>.005?'0':'1'
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw)}
  window.addEventListener('scroll',schedule,{passive:true});reduced.addEventListener('change',schedule);schedule()
  return()=>{window.removeEventListener('scroll',schedule);reduced.removeEventListener('change',schedule);if(frame)cancelAnimationFrame(frame)}
 },[])
 return <div className="editorial-hero hpin" ref={root}>
  <div className="hero-curtain hero-curtain-top" aria-hidden="true"/><div className="hero-curtain hero-curtain-bottom" aria-hidden="true"/>
  <h1 className="editorial-title"><span><b><i>كل</i></b> <b><i>ما</i></b> <b><i>يناسبك،</i></b></span><span><b><i>بمكان</i></b> <b><i>واحد</i></b></span></h1>
  <div className="editorial-stage"><div className="editorial-word" dir="ltr">YOU&amp;ME</div><div className="editorial-glow" aria-hidden="true"/><div className="editorial-base" aria-hidden="true"/>
   {central&&<button className="editorial-product editorial-central" aria-label={`تفاصيل ${central.nameAr}`} onClick={()=>onOpenDetails(central.id)}><span><span className="editorial-image-crop"><Image src={central.imageUrl!} alt={central.nameAr} fill sizes="(min-width:900px) 280px, 150px" priority/></span></span></button>}
   {items.map((item,index)=>item&&<button key={item.id} data-index={index} className={`editorial-product editorial-small editorial-small-${index}`} aria-label={`تفاصيل ${item.nameAr}`} onClick={()=>onOpenDetails(item.id)}><span><Image src={item.imageUrl!} alt={item.nameAr} fill sizes="100px"/></span></button>)}
   {[0,1,2,3,4].map(i=><b key={i} className={`editorial-spark editorial-spark-${i}`} aria-hidden="true"/>)}
  </div>
  <div className="editorial-actions"><button onClick={()=>onScrollTo('shop')}>تسوّق الآن</button><button onClick={()=>onScrollTo('bestsellers')}>الأكثر مبيعاً</button></div>
  <p className="hero-scroll-hint">اسحب لتحت وشوف المنتجات بتفوت ↓</p>
 </div>
}
