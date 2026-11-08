'use client'

import Link from './StoreNavigation'
import { createContext, useContext, type ComponentProps } from 'react'
import { collectionHref } from '@/lib/store-categories'

export const CategoryUrls = createContext<Record<string, string>>({})

export default function CategoryLink({ slug, onNavigate, ...props }: { slug: string | null } & Omit<ComponentProps<typeof Link>, 'href'>) {
  const urls = useContext(CategoryUrls)
  const href = (slug && urls[slug]) || collectionHref(slug)
  return <Link prefetch={false} {...props} href={href} onNavigate={event => {
    let prevented = false
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault() } })
    if(prevented)event.preventDefault()
  }} />
}
