'use client'

import { BagIcon } from '@/components/icons'
import { formatJod } from '@/lib/format'
import type { SiteSettings } from '@/types/product'

export default function MobileCartBar({ count, total, settings, open, onOpenCart }: {
  count: number; total: number; settings: SiteSettings; open:boolean; onOpenCart: () => void
}) {
  return <div className={`mobile-shopping-bar ${count > 0 && !open ? 'is-visible' : ''}`} aria-hidden={count === 0 || open} inert={count === 0 || open}>
    <button key={count} onClick={onOpenCart} aria-label={`عرض السلة، ${count} منتجات، ${formatJod(total, settings.currency)}`}>
      <span className="mobile-bag-count"><BagIcon /><b>{count}</b></span>
      <span className="mobile-bag-copy">عرض السلة<small>{count} منتجات</small></span>
      <strong dir="ltr">{formatJod(total, settings.currency)}</strong>
      <span className="mobile-bag-arrow" aria-hidden="true">←</span>
    </button>
  </div>
}
