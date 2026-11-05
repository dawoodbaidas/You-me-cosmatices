'use client'

import Link from 'next/link'
import { createContext, useContext, type ComponentProps } from 'react'
import { collectionHref } from '@/lib/store-categories'

export const CategoryUrls = createContext<Record<string, string>>({})

export default function CategoryLink({ slug, onNavigate, ...props }: { slug: string | null } & Omit<ComponentProps<typeof Link>, 'href'>) {
  const urls = useContext(CategoryUrls)
  const href = (slug && urls[slug]) || collectionHref(slug)
  return <Link prefetch={true} {...props} href={href} onNavigate={event => {
    let prevented = false
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault() } })
    if (!prevented && window.location.pathname !== href) {
      window.history.replaceState({ ...window.history.state, categoryScrollY: window.scrollY, categoryScrollCount: Number(document.getElementById('shop')?.dataset.visibleCount) || 12, categoryScrollUrl: location.pathname + location.search }, '')
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }} />
}
