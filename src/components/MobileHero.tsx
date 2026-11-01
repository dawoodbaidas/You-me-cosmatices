'use client'

import { useCallback, useId, useMemo, useRef } from 'react'
import { getImageProps } from 'next/image'
import { heroProducts, sceneAssets } from '@/lib/scene-products'
import { clamp } from '@/lib/scene-palette'
import type { Product } from '@/types/product'
import SceneProductImage from './SceneProductImage'
import { useSceneFrame, type SceneFrame } from './useSceneFrame'
import styles from './scroll-scenes.module.css'

const ease = (t: number) => { const p = clamp(t); return p * p * (3 - 2 * p) }
const out = (t: number) => 1 - (1 - clamp(t)) ** 3
const back = (t: number) => { const p = clamp(t) - 1; return 1 + 2.70158 * p ** 3 + 1.70158 * p ** 2 }
const marquee = 'عطور ✦ PERFUMES ✦ عناية ✦ SKINCARE ✦ مكياج ✦ MAKEUP ✦ YOU & ME ✦ '

export default function MobileHero({ products, onScrollTo, onOpenDetails }: {
  products: Product[]; currency: string; onScrollTo: (id: string) => void
  onAddToCart: (id: string, variant: string | null) => void; onOpenDetails: (id: string) => void
}) {
  const root = useRef<HTMLElement>(null)
  const items = useMemo(() => heroProducts(products), [products])
  const maskId = useId().replace(/:/g, '')
  const main = items[0], asset = main && sceneAssets[main.slug]
  const maskSrc = asset && getImageProps({ src: asset.src, alt: '', width: 260, height: Math.round(260 * asset.height / asset.width) }).props.src
  const draw = useCallback(({ progress: hp, elapsed: time, reduced, width }: SceneFrame) => {
    const element = root.current
    if (!element) return
    const u = Math.min(1.12, width / 390), exit = reduced ? 0 : ease((hp - .55) / .45)
    element.querySelectorAll<HTMLElement>('[data-curtain]').forEach((panel, i) => {
      panel.style.transform = `translateY(${(i ? 1 : -1) * 101 * (reduced ? 1 : ease(time / 1.1))}%)`
    })
    element.querySelectorAll<HTMLElement>('[data-word]').forEach((word, i) => {
      word.style.transform = `translateY(${110 * (1 - (reduced ? 1 : out((time - 1.1 - i * .1) / .55)))}%)`
    })
    const shelf = element.querySelector<HTMLElement>('[data-shelf]')!
    shelf.style.transform = `scaleX(${reduced ? 1 : out((time - 1.1) / .6)})`
    element.querySelectorAll<HTMLElement>('[data-hero-product]').forEach((card, index) => {
      if (index === 0) {
        const rise = reduced ? 1 : back((time - .55) / 1.1)
        card.style.transform = `translate3d(0,${90 * (1 - rise) + 70 * exit}px,0) scale(${1 + .55 * exit})`
        card.style.opacity = '1'
        return
      }
      const side = index % 2 ? 1 : -1, outer = index > 2
      const distance = (outer ? 170 : 112) * u, productWidth = (outer ? 52 : 80) * u
      const enter = reduced ? 1 : ease((hp - (outer ? .08 : 0)) / .4)
      const x = side * (distance * enter + (width / 2 + productWidth + 30) * (1 - enter) + exit * width * .28)
      card.style.transform = `translate3d(${x}px,0,0) rotate(${side * 22 * (1 - enter)}deg) scale(${1 + .2 * exit})`
      card.style.opacity = String(1 - .92 * exit)
    })
    element.querySelectorAll<HTMLElement>('[data-hero-copy]').forEach((copy, index) => {
      copy.style.transform = `translateY(${(index ? 30 : -35) * exit}px)`
      copy.style.opacity = String(1 - exit)
      copy.inert = exit > .98
    })
    const wordmark = element.querySelector<HTMLElement>('[data-wordmark]')!
    wordmark.style.transform = `translateX(${-140 * (reduced ? 0 : hp)}px)`
    const glow = element.querySelector<HTMLElement>('[data-glow]')!
    glow.style.transform = `scale(${reduced ? 1 : 1 + .08 * Math.sin(time * Math.PI / 2.5)})`
    glow.style.opacity = String(reduced ? .8 : .7 + .15 * Math.sin(time * Math.PI / 2.5))
    const shine = element.querySelector<SVGRectElement>('[data-shine]')
    if (shine && asset) {
      const phase = (time % 5) / 1.2
      shine.style.transform = `translateX(${(phase - .4) * asset.width * 2}px) skewX(-20deg)`
      shine.style.opacity = reduced || phase > 1 ? '0' : '.3'
    }
    const hint = element.querySelector<HTMLElement>('[data-hint]')!
    hint.style.opacity = hp > .002 || reduced ? '0' : '1'
    const dot = hint.querySelector<HTMLElement>('i')!
    dot.style.transform = `translateY(${reduced ? 0 : time % 1.8 / 1.8 * 24}px)`
    element.querySelector<HTMLElement>('[data-marquee]')!.style.transform = `translateX(${reduced ? 0 : time % 26 / 26 * 50}%)`
  }, [asset])
  useSceneFrame(root, draw, true)

  return <section id="home" ref={root} className={styles.hero} aria-label="الرئيسية">
    <div className={styles.heroPin} data-scene-pin>
      <div className={styles.curtainTop} data-curtain aria-hidden="true" /><div className={styles.curtainBottom} data-curtain aria-hidden="true" />
      <h1 className={styles.heroTitle} data-hero-copy>{[['كل', 'ما', 'يناسبك،'], ['بمكان', 'واحد']].map((line, index) => <span key={index}>{line.map(word => <b key={word}><i data-word>{word}</i></b>)}</span>)}</h1>
      <div className={styles.heroStage}>
        <span className={styles.heroWordmark} data-wordmark aria-hidden="true" dir="ltr">YOU&amp;ME</span>
        <span className={styles.heroGlow} data-glow aria-hidden="true" />
        <span className={styles.shelf} data-shelf aria-hidden="true" />
        {items.map((product, index) => <button key={product.id} className={`${styles.heroProduct} ${index === 0 ? styles.heroMain : index < 3 ? styles.heroMiddle : styles.heroOuter}`} data-hero-product
          aria-label={`عرض تفاصيل ${product.nameAr}`} onClick={() => onOpenDetails(product.id)}>
          <span className={styles.productShadow} aria-hidden="true" />
          <SceneProductImage product={product} preload={index === 0} eager sizes="(max-width:599px) 130px, 180px" />
          {index === 0 && asset && <svg className={styles.shine} viewBox={`${asset.bounds.x} ${asset.bounds.y} ${asset.bounds.width} ${asset.bounds.height}`} preserveAspectRatio="none" aria-hidden="true">
            <defs><clipPath id={`${maskId}-clip`}><rect x={asset.bounds.x} y={asset.bounds.y} width={asset.bounds.width} height={asset.bounds.height} /></clipPath>
              <mask id={`${maskId}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={asset.width} height={asset.height} style={{ maskType: 'alpha' }}><image href={maskSrc} width={asset.width} height={asset.height} /></mask></defs>
            <g clipPath={`url(#${maskId}-clip)`} mask={`url(#${maskId}-mask)`}><rect data-shine x="0" y="0" width={asset.width * .2} height={asset.height} fill="white" /></g>
          </svg>}
        </button>)}
      </div>
      <div className={styles.heroActions} data-hero-copy><button onClick={() => onScrollTo('shop')}>تسوّق الآن</button><button onClick={() => onScrollTo('bestsellers')}>الأكثر مبيعاً</button></div>
      <div className={styles.scrollHint} data-hint aria-hidden="true"><span><i /></span></div>
      <div className={styles.marquee} data-hero-copy aria-label="عطور، عناية، مكياج"><div data-marquee aria-hidden="true"><span>{marquee}</span><span>{marquee}</span></div></div>
    </div>
  </section>
}
