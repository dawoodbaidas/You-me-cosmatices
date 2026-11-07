'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react'

function pathOf(href: string) { return new URL(href, 'http://store.local').pathname.replace(/\/$/, '') || '/' }
const NavigationContext = createContext<{
  activePath: string
  begin: (href: string) => void
  push: (href: string) => void
} | null>(null)

export function StoreNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [intent, setIntent] = useState<{ pathname: string; to: string | null }>({ pathname, to: null })
  // Intent lasts only until a route commits. A completed intent must never
  // reactivate when Back later returns to its original source pathname.
  if (intent.pathname !== pathname) setIntent({ pathname, to: null })
  const begin = useCallback((href: string) => {
    setIntent({ pathname, to: pathOf(href) })
    window.dispatchEvent(new Event('store:navigate'))
  }, [pathname])
  useEffect(() => {
    const back = () => begin(window.location.pathname)
    window.addEventListener('popstate', back)
    return () => window.removeEventListener('popstate', back)
  }, [begin])
  const activePath = intent.pathname === pathname ? intent.to ?? pathOf(pathname) : pathOf(pathname)
  const value = useMemo(() => ({ activePath, begin, push: (href: string) => { begin(href); router.push(href) } }), [activePath, begin, router])
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useStoreNavigation() {
  const value = useContext(NavigationContext)
  if (!value) throw new Error('Store navigation requires the store layout')
  return value
}

// Next calls onNavigate only for an actual same-origin client navigation, after
// modified clicks and cancellation have been handled. No global click guessing.
export default function StoreLink({ href, onNavigate, ...props }: ComponentProps<typeof Link>) {
  const navigation = useContext(NavigationContext)
  return <Link {...props} href={href} onNavigate={event => {
    let prevented = false
    onNavigate?.({ preventDefault() { prevented = true; event.preventDefault() } })
    if (!prevented) navigation?.begin(typeof href === 'string' ? href : href.pathname ?? '/')
  }} />
}
