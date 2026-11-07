'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Price from './Price'
import { productPricing } from '@/lib/pricing'
import { clamp, interpolatePalette, showcasePosition, type ScenePalette } from '@/lib/scene-palette'
import { productSceneAsset } from '@/lib/scene-products'
import { mobileShowcaseGeometry } from '@/lib/mobile-scene-geometry'
import type { Product } from '@/types/product'
import SceneProductImage from './SceneProductImage'
import { useSceneFrame, type SceneFrame } from './useSceneFrame'
import styles from './scroll-scenes.module.css'
import { PRODUCT_IMAGE_SIZES } from '@/lib/product-media'
import { prefetchProductDetails } from './CachedProductImage'

const DEFAULT_PALETTE: ScenePalette = { bgA: [248, 245, 239], bgB: [236, 229, 216] }

export default function BestSellers({ products, currency, onAddToCart, onOpenDetails }: {
  products: Product[]; currency: string; onAddToCart: (id: string, variant: string | null) => void; onOpenDetails: (id: string) => void
}) {
  const root = useRef<HTMLElement>(null)
  const items = products
  const palettes = useMemo(() => items.map(item => {
    const asset = productSceneAsset(item)
    return asset ? { bgA: asset.bgA, bgB: asset.bgB } : DEFAULT_PALETTE
  }), [items])
  const [active, setActive] = useState(0)
  const [visited, setVisited] = useState<string[]>(() => items.slice(0, 2).flatMap(item => productSceneAsset(item)?.src ?? item.imageUrl ?? []))
  const [added, setAdded] = useState(false)
  const activeRef = useRef(0), manual = useRef<number | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const draw = useCallback(({ progress, reduced, width }: SceneFrame) => {
    const element = root.current
    if (!element || !items.length) return
    const last = Math.max(1, items.length - 1)
    const position = reduced ? manual.current ?? 0 : clamp(progress) * last
    const index = Math.round(position)
    const floor = Math.min(Math.floor(position), last - 1)
    const palette = interpolatePalette(palettes[floor] ?? DEFAULT_PALETTE, palettes[Math.min(floor + 1, last)] ?? DEFAULT_PALETTE, position - floor)
    const bg = element.querySelector<HTMLElement>('[data-showcase-bg]')
    if (bg) bg.style.background = `linear-gradient(165deg, rgb(${palette.bgA.join(',')}), rgb(${palette.bgB.join(',')}))`
    element.querySelectorAll<HTMLElement>('[data-showcase-item]').forEach((item, itemIndex) => {
      const delta = itemIndex - position, distance = Math.abs(delta)
      const arc = width < 768 ? mobileShowcaseGeometry(delta, width) : {
        x: showcasePosition(delta, width), y: Math.min(distance, 1) ** 2 * Math.min(65, width * .08),
        rotation: delta * -6, scale: Math.max(.55, 1 - .28 * distance),
      }
      item.style.transform = `translate3d(${arc.x}px,${arc.y}px,0) rotate(${arc.rotation}deg) scale(${arc.scale})`
      item.style.opacity = String(clamp((1.5 - distance) / .5) * (1 - .15 * Math.min(distance, 1)))
      item.inert = distance > .55
      item.style.visibility = distance <= 1.5 ? 'visible' : 'hidden'
      item.style.zIndex = String(10 - Math.round(distance * 5))
    })
    element.querySelectorAll<HTMLElement>('[data-showcase-info]').forEach((info, infoIndex) => {
      const opacity = infoIndex === index ? 1 : 0
      info.style.opacity = String(opacity)
      info.style.pointerEvents = opacity > .5 ? 'auto' : 'none'
      info.inert = opacity <= .5
    })
    const hint = element.querySelector<HTMLElement>('[data-showcase-hint]')
    if (hint) hint.style.opacity = reduced || progress > .002 ? '0' : '1'
    if (index !== activeRef.current) {
      const direction = Math.sign(index - activeRef.current)
      setVisited(previous => [...new Set([
        ...previous.filter(source => items.some(item => (productSceneAsset(item)?.src ?? item.imageUrl) === source)),
        ...items.filter((_, i) => Math.abs(i - index) <= 1 || i === index + direction * 2)
          .flatMap(item => productSceneAsset(item)?.src ?? item.imageUrl ?? []),
      ])])
      activeRef.current = index
      setActive(index)
      setAdded(false)
    }
  }, [items, palettes])
  const redraw = useSceneFrame(root, draw)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const select = (index: number) => {
    const element = root.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      manual.current = index
      redraw()
      return
    }
    manual.current = null
    const pin = element.querySelector<HTMLElement>('[data-scene-pin]')
    const range = Math.max(0, element.offsetHeight - (pin?.offsetHeight ?? window.innerHeight))
    const top = element.getBoundingClientRect().top + window.scrollY + (index / Math.max(1, items.length - 1)) * range
    window.scrollTo({ top, behavior: 'smooth' })
  }

  if (!items.length) return null

  return <section id="bestsellers" ref={root} className={styles.showcase} style={{ '--count': items.length } as CSSProperties} aria-labelledby="bestsellers-title">
    <div className={styles.showcasePin} data-scene-pin>
      <div className={styles.showcaseBg} data-showcase-bg aria-hidden="true" />
      <div className={styles.showcaseGlow} aria-hidden="true" />
      <header className={styles.showcaseHeading}>
        <p>مختاراتنا</p>
        <h2 id="bestsellers-title">الأكثر طلباً.</h2>
      </header>
      <div className={styles.showcaseStage}>
        {items.map((item, index) => {
          const asset = productSceneAsset(item)
          const ratio = asset ? asset.bounds.width / asset.bounds.height : 4 / 5
          return <div key={item.id} className={styles.showcaseItem} data-showcase-item style={{ aspectRatio: String(ratio) }}>
            <span className={styles.showcaseShadow} aria-hidden="true" />
            <button className={styles.showcaseProduct} aria-label={`عرض تفاصيل ${item.nameAr}`} onClick={() => onOpenDetails(item.id)} onPointerEnter={() => prefetchProductDetails(item.imageUrl)} onFocus={() => prefetchProductDetails(item.imageUrl)}>
              {(Math.abs(index - active) <= 1 || visited.includes(asset?.src ?? item.imageUrl ?? '')) && <SceneProductImage product={item} sizes={PRODUCT_IMAGE_SIZES.scene} />}
              {(productPricing(item).discount || item.isNew) && <span className={styles.sceneBadge}>{productPricing(item).discount ? `-${productPricing(item).discount}%` : 'جديد'}</span>}
            </button>
          </div>
        })}
      </div>
      <div className={styles.showcaseInfo}>
        {items.map((item, index) => <div key={item.id} className={styles.showcaseInfoItem} data-showcase-info aria-hidden={index !== active} inert={index !== active}>
          <span className={styles.showcaseCategory}>{item.categoryLabel}{productPricing(item).discount && item.isNew && <span className={styles.sceneNew}> جديد</span>}</span>
          <h3>{item.nameAr}</h3>
          {item.description && <p>{item.description}</p>}
          <div className={styles.showcaseBuy}>
            <Price value={productPricing(item, item.variants[0]).price} oldPrice={productPricing(item, item.variants[0]).oldPrice} currency={currency} />
            <button onClick={() => {
              onAddToCart(item.id, item.variants[0]?.id ?? null)
              setAdded(true)
              if (timer.current) clearTimeout(timer.current)
              timer.current = setTimeout(() => setAdded(false), 1600)
            }}>{added && index === active ? 'تمت الإضافة ✓' : 'أضف للسلة'}</button>
          </div>
        </div>)}
      </div>
      <div className={styles.showcaseDots} aria-label="المنتجات المميزة">
        {items.map((item, index) => <button key={item.id} aria-label={`عرض ${item.nameAr}`} aria-current={active === index ? 'true' : undefined} onClick={() => select(index)}><span /></button>)}
      </div>
      <p className={styles.showcaseHint} data-showcase-hint aria-hidden="true">كمّل سكرول لتشوف باقي المنتجات</p>
    </div>
  </section>
}
