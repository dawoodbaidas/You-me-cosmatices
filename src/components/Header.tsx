'use client'

import Link from 'next/link'
import StoreBrand from './StoreBrand'
import CategoryLink from './CategoryLink'
import { useEffect, useRef, useState } from 'react'
import { BagIcon, CloseIcon, HeartIcon } from './icons'
import BoutiqueDialog from './BoutiqueDialog'
import type { Collection } from '@/lib/taxonomy'
import type { SiteSettings } from '@/types/product'

export default function Header({ settings, cartCount, favoriteCount, onOpenCart, onScrollTo, groups, selected, cataloguePage, onSearch }: {
  onSearch: () => void; settings: SiteSettings; cartCount: number; favoriteCount: number
  onOpenCart: () => void; onScrollTo: (id: string) => void
  groups: Collection[]; selected: string | null; cataloguePage: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mega, setMega] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [active, setActive] = useState('home')
  const header = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = header.current, root = element?.closest<HTMLElement>('.boutique')
    if (!element || !root) return
    const observer = new ResizeObserver(() => root.style.setProperty('--header-height', `${element.getBoundingClientRect().height}px`))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id)
    }), { rootMargin: '-20% 0px -65% 0px' })
    for (const id of ['home', 'bestsellers', 'shop', 'contact']) {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    }
    return () => observer.disconnect()
  }, [])

  const closeMenus = () => { setOpen(false); setMega(false) }
  const search = () => { closeMenus(); onSearch() }

  return <>
      <div className="announcement"><span>{settings.storeAnnouncement}</span><span className="announcement-tag">You&amp;Me / الأردن</span></div>
      <header ref={header} className="world-header shop-header">
        <button className="menu-trigger" aria-label="فتح القائمة" aria-expanded={open} onClick={() => setOpen(true)}><span /><span /><small>القائمة</small></button>
        <Link className="world-brand" href="/" prefetch={true}><StoreBrand /></Link>
        <nav className="world-desktop-nav" aria-label="التنقل الرئيسي">
          <Link href="/" prefetch={true} aria-current={!cataloguePage && active === 'home' ? 'page' : undefined}>الرئيسية</Link>
          <Link href="/#bestsellers" aria-current={!cataloguePage && active === 'bestsellers' ? 'location' : undefined}>الأكثر طلبًا</Link>
          <CategoryLink slug={null} aria-current={selected === 'all' ? 'page' : undefined}>المتجر</CategoryLink>
          <div className="mega-anchor" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)} onKeyDown={event => { if (event.key === 'Escape') setMega(false) }}>
            <button aria-expanded={mega} aria-controls="shop-mega" onClick={() => setMega(!mega)}>الأقسام ▾</button>
            {mega && <div id="shop-mega" className="shop-mega">{groups.map(group => <div key={group.id}>
              <CategoryLink slug={group.id} onClick={closeMenus} aria-current={selected === group.id ? 'page' : undefined}>{group.label} <small>({group.productIds.length})</small></CategoryLink>
              {group.children.map(child => <CategoryLink key={child.id} slug={child.id} onClick={closeMenus} aria-current={selected === child.id ? 'page' : undefined}>{child.label} <small>({child.productIds.length})</small></CategoryLink>)}
            </div>)}</div>}
          </div>
          
          <button onClick={() => onScrollTo('contact')}>عن العلامة</button>
        </nav>
        <div className="world-nav-actions">
          <button className="nav-search" aria-label="البحث" onClick={search}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg></button>
          <button className="header-favorites" onClick={() => onScrollTo('shop')} aria-label={`المفضلة، ${favoriteCount} منتجات`}><HeartIcon />{favoriteCount > 0 && <span>{favoriteCount}</span>}</button>
          <button className="header-bag" onClick={onOpenCart} aria-label={`السلة، ${cartCount} منتجات`}><BagIcon />{cartCount > 0 && <span>{cartCount}</span>}</button>
        </div>
        <nav className={`mobile-departments${cataloguePage ? ' category-departments' : ''}`} aria-label="أقسام المتجر">
          <CategoryLink slug={null} aria-current={selected === 'all' ? 'page' : undefined}>الكل</CategoryLink>
          {groups.map(group => <CategoryLink key={group.id} slug={group.id} aria-current={selected === group.id ? 'page' : undefined} data-active={group.children.some(child => child.id === selected) || undefined}>{group.label}</CategoryLink>)}
        </nav>
      </header>
    <BoutiqueDialog open={open} onClose={() => setOpen(false)} label="قائمة المتجر" className="menu-dialog">
      <div className="shopping-menu" dir="rtl">
        <div className="shopping-menu-head"><StoreBrand /><button className="icon-button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)}><CloseIcon /></button></div>
        <nav aria-label="التنقل">
          <Link href="/" prefetch={true} onClick={closeMenus}>الرئيسية</Link>
          <Link href="/#bestsellers" onClick={closeMenus}>الأكثر طلبًا</Link>
          <CategoryLink slug={null} onClick={closeMenus}>جميع المنتجات</CategoryLink>
        </nav>
        <p className="shopping-menu-label">تسوق حسب القسم</p>
        {groups.map(group => <div className="shopping-group" key={group.id}>
          <div>
            <CategoryLink slug={group.id} onClick={closeMenus} aria-current={selected === group.id ? 'page' : undefined}>{group.label} <small>{group.productIds.length}</small></CategoryLink>
            {group.children.length > 0 && <button className="expand-group" aria-label={`عرض أقسام ${group.label}`} aria-expanded={expanded === group.id} onClick={() => setExpanded(expanded === group.id ? null : group.id)}>{expanded === group.id ? '−' : '+'}</button>}
          </div>
          {expanded === group.id && <div className="shopping-subgroups">
            <button onClick={() => setExpanded(null)}>← رجوع إلى الأقسام</button>
            <CategoryLink slug={group.id} onClick={closeMenus}>كل {group.label} <small>{group.productIds.length}</small></CategoryLink>
            {group.children.map(child => <CategoryLink key={child.id} slug={child.id} aria-current={selected === child.id ? 'page' : undefined} onClick={closeMenus}>{child.label} <small>{child.productIds.length}</small></CategoryLink>)}
          </div>}
        </div>)}
      </div>
    </BoutiqueDialog>
  </>
}
