'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function StorefrontMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const refresh = () => ScrollTrigger.refresh()
        document.fonts.ready.then(refresh)
        window.addEventListener('load', refresh, { once: true })
        window.addEventListener('boutique:layout', refresh)

        return () => {
          window.removeEventListener('load', refresh)
          window.removeEventListener('boutique:layout', refresh)
        }
      })

      return () => mm.revert()
    }, root)

    return () => ctx.revert()
  }, [])

  return <div ref={root} className="boutique">{children}</div>
}
