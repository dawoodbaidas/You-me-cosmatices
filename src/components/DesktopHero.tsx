'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Product } from '@/types/product'
import { ArrowIcon } from './icons'

gsap.registerPlugin(ScrollTrigger)

export default function DesktopHero({ products, onScrollTo, onOpenDetails }: {
  products: Product[]
  onScrollTo: (id: string) => void
  onOpenDetails: (id: string) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const select = (slug: string) => products.find(p => p.slug === slug && p.imageUrl)
  const men = select('wild-colt-assaf-for-men') ?? select('frankel-black-elixir')
  const women = select('arrogate-girl-assaf') ?? select('arrogate-pink-diva-assaf')
  const care = select('whitening-moisturizing-spray-bulgarian-scent') ?? select('aloe-gel')
  const subjects = [care, men, women].filter((p): p is Product => Boolean(p))

  useEffect(() => {
    const media = gsap.matchMedia()
    media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.timeline({ defaults: { ease: 'power3.out', duration: .85 } })
        .from('.campaign-halo', { opacity: 0, scale: .96 }, 0)
        .from('.campaign-title span', { yPercent: 105, stagger: .1 }, .15)
        .from('.campaign-photo-1 .campaign-image', { opacity: 0, y: 18, scale: .97 }, .35)
        .from('.campaign-photo-0 .campaign-image, .campaign-photo-2 .campaign-image', { opacity: 0, y: 22, stagger: .12 }, .5)
        .from('.campaign-note', { opacity: 0, y: 10 }, .8)
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: .7 } })
        .to('.campaign-photo-0', { x: -8, y: -24, rotation: -2, ease: 'none' }, 0)
        .to('.campaign-photo-1', { y: -12, scale: 1.02, ease: 'none' }, 0)
        .to('.campaign-photo-2', { x: 8, y: -18, rotation: 2, ease: 'none' }, 0)
        .to('.campaign-title', { y: -8, ease: 'none' }, 0)
        .to('.campaign-halo', { scale: 1.04, ease: 'none' }, 0)
    }, root)
    return () => media.revert()
  }, [])

  return <div className="desktop-campaign" ref={root}>
    <div className="campaign-top"><span dir="ltr">YOU &amp; ME / EVERYDAY, EVERYONE.</span><span>عطور · عناية · مستحضرات</span></div>
    <div className="campaign-halo" aria-hidden="true" />
    <div className="campaign-orbit" aria-hidden="true" />
    <p className="campaign-edition" dir="ltr">FRAGRANCE &amp; CARE<br />FOR EVERYONE.</p>
    <h2 className="campaign-title"><div><span>كل ما يناسبك،</span></div><div><span>بمكان واحد.</span></div></h2>
    <div className="campaign-photos">
      {subjects.map((product, index) => <button className={`campaign-photo campaign-photo-${index}`} key={product.id} onClick={() => onOpenDetails(product.id)} aria-label={product.nameAr}>
        <span className="campaign-image"><Image src={product.imageUrl!} alt={product.nameAr} fill sizes="(min-width: 1024px) 320px, 1px" /></span>
      </button>)}
    </div>
    <div className="campaign-note"><p>عطور، عناية، ومستحضرات مختارة لتفاصيل يومك.</p><button onClick={() => onScrollTo('shop')}>اكتشف المنتجات <ArrowIcon /></button></div>
    <div className="campaign-bottom"><span>عالم من الاختيارات، للجميع.</span><span dir="ltr">EXPLORE THE COLLECTION ↓</span></div>
  </div>
}
