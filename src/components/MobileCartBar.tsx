'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { BagIcon } from '@/components/icons'
import { formatJod } from '@/lib/format'
import type { SiteSettings } from '@/types/product'

/** Arabic plural for item counts without overcomplicating the badge copy. */
const itemCountNoun = (count: number) => count === 1 ? 'منتج واحد' : count === 2 ? 'منتجان' : `${count} منتجات`

export default function MobileCartBar({ count, total, settings, open, onOpenCart }: {
  count: number; total: number; settings: SiteSettings; open:boolean; onOpenCart: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const pathname = usePathname()
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = bar.current, root = element?.closest<HTMLElement>('.boutique')
    if (!element || !root) return
    const measure = () => {
      // Hidden by a dialog/desktop CSS? Retain the last measured mobile height.
      if (element.offsetHeight) root.style.setProperty('--mobile-cart-height', `${element.offsetHeight}px`)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => { observer.disconnect(); root.style.removeProperty('--mobile-cart-height') }
  }, [])
  const excluded = pathname === '/cart' || pathname.startsWith('/checkout') || pathname.startsWith('/admin') || pathname.startsWith('/products/')
  const hidden = count === 0 || open || excluded
  return <div ref={bar} data-cart-page={excluded} className={`mobile-shopping-bar ${hidden ? '' : 'is-visible'}`} aria-hidden={hidden} inert={hidden}>
    <button onClick={onOpenCart} aria-label={`عرض السلة، ${itemCountNoun(count)}، ${formatJod(total, settings.currency)}`}>
      <span className="mobile-bag-count"><BagIcon /><b>{count}</b></span>
      <span className="mobile-bag-copy">عرض السلة<small>{itemCountNoun(count)}</small></span>
      <strong dir="ltr">{formatJod(total, settings.currency)}</strong>
      <span className="mobile-bag-arrow" aria-hidden="true">←</span>
    </button>
  </div>
}
