'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { collectionHref } from '@/lib/store-categories'

export default function CategoryLink({ slug, onNavigate, ...props }: { slug: string | null } & Omit<ComponentProps<typeof Link>, 'href'>) {
  const href = collectionHref(slug)
  return <Link prefetch={true} {...props} href={href} onNavigate={event => {
    let cancelled = false
    onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault() } })
    if (cancelled) return
    if (window.location.pathname !== href) window.dispatchEvent(new Event('store:navigate'))
  }} />
}
