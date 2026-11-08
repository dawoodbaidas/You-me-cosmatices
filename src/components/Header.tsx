'use client'

import Link, { useStoreNavigation } from './StoreNavigation'
import Logo from './Logo'
import CategoryLink from './CategoryLink'
import CategoryCircles from './CategoryCircles'
import { findCollection } from '@/lib/store-categories'
import { useEffect, useRef, useState } from 'react'
import { BagIcon, CloseIcon, HeartIcon } from './icons'
import BoutiqueDialog from './BoutiqueDialog'
import type { Collection } from '@/lib/taxonomy'
import type { SiteSettings } from '@/types/product'

export default function Header({ settings, cartCount, favoriteCount, onScrollTo, groups, selected, cataloguePage, onSearch }: {
  onSearch: () => void; settings: SiteSettings; cartCount: number; favoriteCount: number
  onScrollTo: (id: string) => void
  groups: Collection[]; selected: string | null; cataloguePage: boolean
}) {
  const { activePath: pathname } = useStoreNavigation()
  const [open, setOpen] = useState(false)
  const [mega, setMega] = useState(false)
  const [active, setActive] = useState('home')
  const header = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = header.current, root = element?.closest<HTMLElement>('.boutique')
    if (!element || !root) return
    const update = () => {
      const height = element.getBoundingClientRect().height
      root.style.setProperty('--header-height', `${height}px`)
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('resize', update)
    return () => { observer.disconnect(); window.removeEventListener('resize', update) }
  }, [pathname])

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id)
    }), { rootMargin: '-20% 0px -65% 0px' })
    for (const id of ['home', 'bestsellers', 'shop', 'contact']) {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    }
    return () => observer.disconnect()
  }, [pathname])

  const closeMenus = () => { setOpen(false); setMega(false) }
  const search = () => { closeMenus(); onSearch() }

  return <>
      <div className="announcement"><span>{settings.storeAnnouncement}</span><span className="announcement-tag">You&amp;Me / الأردن</span></div>
      <header ref={header} className="site-header world-header shop-header">
        <button className="menu-trigger" aria-label="فتح القائمة" aria-expanded={open} onClick={() => setOpen(true)}><span /><span /></button>
        <Link className="world-brand" href="/" prefetch={false} aria-label="You & Me Cosmetics"><Logo preload /></Link>
        <nav className="world-desktop-nav" aria-label="التنقل الرئيسي">
          <Link href="/" prefetch={false} aria-current={!cataloguePage && active === 'home' ? 'page' : undefined}>الرئيسية</Link>
          <Link href="/#bestsellers" prefetch={false} aria-current={!cataloguePage && active === 'bestsellers' ? 'page' : undefined}>الأكثر طلبًا</Link>
          <Link href="/categories" onClick={closeMenus} aria-current={cataloguePage || (!cataloguePage && active === 'shop') ? 'page' : undefined}>المتجر</Link>
          <div className="mega-anchor" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)} onKeyDown={event => { if (event.key === 'Escape') setMega(false) }}>
            <button aria-expanded={mega} aria-controls="shop-mega" onClick={() => setMega(true)}>الأقسام ▾</button>
            {mega && <div id="shop-mega" className="shop-mega">{groups.map(group => <div key={group.id}>
              <CategoryLink slug={group.id} onClick={closeMenus} aria-current={selected === group.id ? 'page' : undefined}>{group.label}</CategoryLink>
              <CategoryBranches groups={group.children} selected={selected} onNavigate={closeMenus} />
            </div>)}</div>}
          </div>
          
          <button onClick={() => onScrollTo('contact')} aria-current={!cataloguePage && active === 'contact' ? 'page' : undefined}>عن العلامة</button>
        </nav>
        <div className="world-nav-actions">
          <button className="nav-search" aria-label="البحث" onClick={search}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg></button>
          <Link className="header-favorites" href="/favorites" prefetch={false} aria-label={`المفضلة، ${favoriteCount} منتجات`}><HeartIcon />{favoriteCount > 0 && <span dir="ltr">{favoriteCount > 99 ? '99+' : favoriteCount}</span>}</Link>
          <Link className="header-bag" href="/cart" prefetch={false} aria-label={`السلة، ${cartCount} منتجات`}><BagIcon />{cartCount > 0 && <span dir="ltr">{cartCount > 99 ? '99+' : cartCount}</span>}</Link>
        </div>
      </header>
      {pathname !== '/' && <CategoryCircles compact groups={groups} selected={groups.find(group => group.id === selected || !!findCollection(group.children, selected))?.id} />}
    <BoutiqueDialog open={open} onClose={() => setOpen(false)} label="قائمة المتجر" className="menu-dialog">
      <div className="shopping-menu" dir="rtl">
        <div className="shopping-menu-head"><Logo compact /><button className="icon-button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)}><CloseIcon /></button></div>
        <nav aria-label="التنقل">
          <Link href="/" prefetch={false} onClick={closeMenus} aria-current={!cataloguePage && active === 'home' ? 'page' : undefined}>الرئيسية</Link>
          <Link href="/#bestsellers" prefetch={false} onClick={closeMenus} aria-current={!cataloguePage && active === 'bestsellers' ? 'page' : undefined}>الأكثر طلبًا</Link>
          <Link href="/categories" onClick={closeMenus} aria-current={cataloguePage || (!cataloguePage && active === 'shop') ? 'page' : undefined}>المتجر</Link>
          <button type="button" className="menu-search" onClick={search}>البحث</button>
          <Link href="/favorites" prefetch={false} onClick={closeMenus}>المفضلة{favoriteCount > 0 ? ` (${favoriteCount})` : ''}</Link>
        </nav>
        <p className="shopping-menu-label">تسوق حسب القسم</p>
        <CategoryBranches groups={groups} selected={selected} onNavigate={closeMenus} />
      </div>
    </BoutiqueDialog>
  </>
}

function CategoryBranches({ groups, selected, onNavigate }: { groups: Collection[]; selected: string | null; onNavigate: () => void }) {
  return <ul className="category-menu-tree">{groups.map(group => <li key={group.id}>
    <CategoryLink slug={group.id} onClick={onNavigate} aria-current={selected === group.id ? 'page' : undefined}>{group.label}</CategoryLink>
    {!!group.children.length && <details><summary aria-label={`عرض أقسام ${group.label}`}>الأقسام الفرعية</summary><CategoryBranches groups={group.children} selected={selected} onNavigate={onNavigate} /></details>}
  </li>)}</ul>
}
