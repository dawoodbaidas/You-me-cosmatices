'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { collectionHref } from '@/lib/store-categories'

export default function CategoryLink({ slug, onNavigate, ...props }: { slug: string | null } & Omit<ComponentProps<typeof Link>, 'href'>) {
  const href = collectionHref(slug)
  return <Link prefetch={true} {...props} href={href} onNavigate={onNavigate} />
}
