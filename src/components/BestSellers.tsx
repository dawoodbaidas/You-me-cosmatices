'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { formatJod } from '@/lib/format'
import type { Product } from '@/types/product'

type RGB = [number, number, number]

// Sample the actual optimized image, ignoring near-white and near-black pixels.
function imageColor(image: HTMLImageElement): RGB | null {
 try {
  const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null
  ctx.drawImage(image,0,0,24,24)
  const pixels=ctx.getImageData(0,0,24,24).data, buckets=new Map<string,{sum:RGB;count:number}>()
  for(let i=0;i<pixels.length;i+=4){
   const [r,g,b,a]=[pixels[i],pixels[i+1],pixels[i+2],pixels[i+3]], brightness=(r+g+b)/3
   if(a<128||brightness<35||brightness>242)continue
   const key=[r,g,b].map(v=>Math.floor(v/32)).join(',')
   const bucket=buckets.get(key)??{sum:[0,0,0] as RGB,count:0};bucket.sum[0]+=r;bucket.sum[1]+=g;bucket.sum[2]+=b;bucket.count++;buckets.set(key,bucket)
  }
  const dominant=Array.from(buckets.values()).sort((a,b)=>b.count-a.count)[0]
  return dominant?dominant.sum.map(v=>Math.round(v/dominant.count)) as RGB:null
 } catch { return null }
}

export default function BestSellers({products,currency,onAddToCart,onBrowse,onOpenDetails}: {products:Product[];currency:string;onAddToCart:(id:string,variant:string|null)=>void;onBrowse:()=>void;onOpenDetails:(id:string)=>void}) {
 const root=useRef<HTMLElement>(null),scene=useRef<HTMLDivElement>(null)
 const items=useMemo(()=>products.filter(p=>p.isFeatured&&p.imageUrl).slice(0,6),[products])
 const [active,setActive]=useState(0),[colors,setColors]=useState<Record<string,RGB>>({}),[added,setAdded]=useState(false)
 const activeRef=useRef(0),manual=useRef(0),redraw=useRef<()=>void>(()=>{}),timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 useEffect(()=>{
  if(!root.current||!scene.current||!items.length)return
  const section=root.current, stage=scene.current, cards=Array.from(stage.querySelectorAll<HTMLElement>('.semicircle-card'))
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0
  const draw=()=>{
   frame=0
   const progress=reduced.matches?manual.current/Math.max(1,items.length-1):Math.max(0,Math.min(1,-section.getBoundingClientRect().top/Math.max(1,section.offsetHeight-innerHeight)))
   const position=progress*(items.length-1),next=Math.max(0,Math.min(items.length-1,Math.round(position)))
   const mobile=innerWidth<600,radius=mobile?stage.clientWidth*.46:Math.min(stage.clientWidth*.38,620),step=mobile?.9:.78
   cards.forEach((card,index)=>{
    const delta=index-position,angle=delta*step,distance=Math.abs(angle),visible=distance<1.22
    const scale=Math.max(.64,1.2-distance*.43), opacity=visible?Math.max(0,Math.min(1,(1.22-distance)/.28)):0
    const x=radius*Math.sin(angle),y=radius*(1-Math.cos(angle))
    card.style.transform=`translate3d(${x}px,${y}px,${-Math.min(distance,1.5)*90}px) translate(-50%,-50%) rotateY(${-angle*9}deg) scale(${scale})`
    card.style.opacity=String(opacity);card.style.zIndex=String(20-Math.round(distance*5));card.style.visibility=opacity>.01?'visible':'hidden'
    const button=card.querySelector('button');if(button)button.tabIndex=opacity>.15?0:-1
   })
   if(next!==activeRef.current){activeRef.current=next;setActive(next);setAdded(false)}
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw)};redraw.current=schedule
  const scroll=()=>{if(!reduced.matches)schedule()}
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',schedule,{passive:true});reduced.addEventListener('change',schedule);schedule()
  return()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('resize',schedule);reduced.removeEventListener('change',schedule);if(frame)cancelAnimationFrame(frame);redraw.current=()=>{};if(timer.current)clearTimeout(timer.current)}
 },[items])
 const select=(index:number)=>{
  if(!root.current)return
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){manual.current=index;redraw.current();return}
  const top=scrollY+root.current.getBoundingClientRect().top,range=Math.max(0,root.current.offsetHeight-innerHeight)
  window.scrollTo({top:top+range*index/Math.max(1,items.length-1),behavior:'smooth'})
 }
 if(!items.length)return null
 const product=items[active]??items[0]
 return <section id="bestsellers" ref={root} className="best-arc-scene semicircle-section" aria-labelledby="bestsellers-title">
  <div className="semicircle-pin">
   <div className="semicircle-backgrounds" aria-hidden="true">{items.map((p,i)=>{const c=colors[p.id];return <div key={p.id} data-palette={c?.join(',')??''} className={active===i?'is-active':''} style={{background:c?`radial-gradient(ellipse at 50% 38%, rgba(${c.join(',')}, .32), #f8f5ef 75%)`:'#f8f5ef'}}/>})}</div>
   <header className="semicircle-heading"><h2 id="bestsellers-title">الأكثر طلباً.</h2></header>
   <div className="semicircle-stage" ref={scene}>{items.map(item=><article className="semicircle-card" key={item.id}><button aria-label={`عرض ${item.nameAr}`} onClick={()=>onOpenDetails(item.id)}><Image src={item.imageUrl!} alt={item.nameAr} fill sizes="(max-width:599px) 160px, 280px" loading="eager" onLoad={event=>{const color=imageColor(event.currentTarget);if(color)setColors(current=>current[item.id]?current:{...current,[item.id]:color})}}/></button></article>)}</div>
   <div className="semicircle-info"><span key={`category-${product.id}`}>{product.categoryLabel}</span><h3 key={`name-${product.id}`}>{product.nameAr}</h3><div><strong key={`price-${product.id}`} dir="ltr">{formatJod(product.variants[0]?.price??product.price,currency)}</strong><button onClick={()=>{onAddToCart(product.id,product.variants[0]?.id??null);setAdded(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setAdded(false),1600)}}>{added?'تمت الإضافة ✓':'أضف للسلة'}</button></div></div>
   <div className="semicircle-dots" aria-label="المنتجات المميزة">{items.map((item,index)=><button key={item.id} aria-label={`عرض ${item.nameAr}`} aria-current={active===index?'true':undefined} onClick={()=>select(index)}><span/></button>)}</div>
   <button className="semicircle-browse" onClick={onBrowse}>تصفح كل المنتجات ←</button>
  </div>
 </section>
}
