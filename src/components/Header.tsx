'use client'
import { useEffect, useState } from 'react'
import { BagIcon, CloseIcon } from './icons'
import BoutiqueDialog from './BoutiqueDialog'
import type { Collection } from '@/lib/taxonomy'
import type { SiteSettings } from '@/types/product'

export default function Header({ settings, cartCount, onOpenCart, onScrollTo, groups, selected, onSelect, onSearch }: {
 onSearch:()=>void; settings: SiteSettings; cartCount: number; favoriteCount: number; onOpenCart:()=>void; onScrollTo:(id:string)=>void
 groups:Collection[]; selected:string|null; onSelect:(id:string|null)=>void
}) {
 const [open,setOpen]=useState(false)
 const [mega,setMega]=useState(false)
 const [expanded,setExpanded]=useState<string|null>(null)
 const [active,setActive]=useState('home')
 useEffect(()=>{
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)setActive(entry.target.id)}),{rootMargin:'-20% 0px -65% 0px'})
  for(const id of ['home','bestsellers','shop','contact']) {const section=document.getElementById(id);if(section)observer.observe(section)}
  return ()=>observer.disconnect()
 },[])
 const choose=(id:string|null)=>{ onSelect(id); setOpen(false); setMega(false) }
 const search=()=>{setOpen(false);setMega(false);onSearch()}
 return <>
  <div className="world-header-wrap shop-header">
   <div className="announcement"><span>{settings.storeAnnouncement}</span><span dir="ltr" className="announcement-tag">YOU &amp; ME / JORDAN</span></div>
   <header className="world-header">
    <button className="menu-trigger" aria-label="فتح القائمة" aria-expanded={open} onClick={()=>setOpen(true)}><span/><span/><small>MENU</small></button>
    <button className="world-brand" dir="ltr" onClick={()=>onScrollTo('home')}>YOU<span>&amp;</span>ME<small>COSMETICS</small></button>
    <nav className="world-desktop-nav" aria-label="التنقل الرئيسي">
     <button aria-current={active==='home'?'location':undefined} onClick={()=>onScrollTo('home')}>الرئيسية</button><button aria-current={active==='bestsellers'?'location':undefined} onClick={()=>onScrollTo('bestsellers')}>الأكثر طلبًا</button><button aria-current={active==='shop'?'location':undefined} onClick={()=>choose(null)}>المتجر</button>
     <div className="mega-anchor" onMouseEnter={()=>setMega(true)} onMouseLeave={()=>setMega(false)} onKeyDown={e=>{if(e.key==='Escape')setMega(false)}}>
      <button aria-expanded={mega} aria-controls="shop-mega" onClick={()=>setMega(!mega)}>الأقسام ▾</button>
      {mega && <div id="shop-mega" className="shop-mega">{groups.map(group=><div key={group.id}><button onClick={()=>choose(group.id)}>{group.label} <small>({group.productIds.length})</small></button>{group.children.map(child=><button key={child.id} onClick={()=>choose(child.id)}>{child.label} <small>({child.productIds.length})</small></button>)}</div>)}</div>}
     </div>
     {groups.some(g=>g.id==='gifts')&&<button onClick={()=>choose('gifts')}>الهدايا</button>}<button onClick={()=>onScrollTo('contact')}>عن العلامة</button>
    </nav>
    <div className="world-nav-actions"><button className="nav-search" aria-label="البحث" onClick={search}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg></button><button className="header-bag" onClick={onOpenCart} aria-label={`السلة، ${cartCount} منتجات`}><BagIcon/>{cartCount>0&&<span>{cartCount}</span>}</button></div>
   </header>
   <nav className="mobile-departments" aria-label="أقسام المتجر"><button aria-pressed={!selected} onClick={()=>choose(null)}>الكل</button>{groups.map(g=><button key={g.id} aria-pressed={selected===g.id||g.children.some(c=>c.id===selected)} onClick={()=>choose(g.id)}>{g.label}</button>)}</nav>
  </div>
  <BoutiqueDialog open={open} onClose={()=>setOpen(false)} label="قائمة المتجر" className="menu-dialog">
   <div className="shopping-menu" dir="rtl"><div className="shopping-menu-head"><strong dir="ltr">YOU &amp; ME</strong><button className="icon-button" aria-label="إغلاق القائمة" onClick={()=>setOpen(false)}><CloseIcon/></button></div>
    <nav aria-label="التنقل"><button onClick={()=>{setOpen(false);onScrollTo('home')}}>الرئيسية</button><button onClick={()=>{setOpen(false);onScrollTo('bestsellers')}}>الأكثر طلبًا</button><button onClick={()=>choose(null)}>جميع المنتجات</button></nav>
    <p className="shopping-menu-label">تسوق حسب القسم</p>
    {groups.map(group=><div className="shopping-group" key={group.id}><div><button onClick={()=>group.children.length?setExpanded(expanded===group.id?null:group.id):choose(group.id)} aria-expanded={group.children.length?expanded===group.id:undefined} aria-current={selected===group.id?'page':undefined}>{group.label} <small>{group.productIds.length}</small></button>{group.children.length>0&&<button className="expand-group" aria-label={`عرض أقسام ${group.label}`} aria-expanded={expanded===group.id} onClick={()=>setExpanded(expanded===group.id?null:group.id)}>{expanded===group.id?'−':'+'}</button>}</div>{expanded===group.id&&<div className="shopping-subgroups"><button onClick={()=>setExpanded(null)}>← رجوع إلى الأقسام</button><button onClick={()=>choose(group.id)}>كل {group.label} <small>{group.productIds.length}</small></button>{group.children.map(child=><button key={child.id} aria-current={selected===child.id?'page':undefined} onClick={()=>choose(child.id)}>{child.label} <small>{child.productIds.length}</small></button>)}</div>}</div>)}
   </div>
  </BoutiqueDialog>
 </>
}
