'use client'

import Link from './StoreNavigation'
import { createContext, useContext, type ComponentProps } from 'react'
import { collectionHref } from '@/lib/store-categories'
import { prefetchCategory } from '@/lib/prefetch-category'

export const CategoryUrls = createContext<Record<string, string>>({})

export default function CategoryLink({ slug, onNavigate, onPointerEnter, onTouchStart, onFocus, ...props }: { slug: string | null } & Omit<ComponentProps<typeof Link>, 'href'>) {
  const urls = useContext(CategoryUrls)
  const href = (slug && urls[slug]) || collectionHref(slug)
  const warm = () => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (slug && !connection?.saveData) prefetchCategory(slug)
  }
  return <Link prefetch={false} {...props} href={href}
    onPointerEnter={event => { onPointerEnter?.(event); warm() }}
    onTouchStart={event => { onTouchStart?.(event); warm() }}
    onFocus={event => { onFocus?.(event); warm() }} onNavigate={event => {
    let prevented = false
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault() } })
    if(prevented)event.preventDefault()
  }} />
}
