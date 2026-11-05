'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { productSceneAsset } from '@/lib/scene-products'
import type { Product } from '@/types/product'
import styles from './scroll-scenes.module.css'

export default function SceneProductImage({ product, preload = false, eager = false, sizes = '(max-width:599px) 260px, 420px', onLoad }: {
  product: Product; preload?: boolean; eager?: boolean; sizes?: string; onLoad?: (image: HTMLImageElement) => void
}) {
  const frame = useRef<HTMLSpanElement>(null)
  const [ready, setReady] = useState(preload || eager)
  useEffect(() => {
    if (ready || !frame.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setReady(true); observer.disconnect() }
    }, { rootMargin: '600px 100px' })
    observer.observe(frame.current)
    return () => observer.disconnect()
  }, [ready])
  const asset = productSceneAsset(product)
  const bounds = asset?.bounds
  const src = asset?.src ?? product.imageUrl
  if (!src) return null
  return <span ref={frame} className={styles.cutout} style={{ aspectRatio: String(bounds ? bounds.width / bounds.height : 4 / 5) }}>
    <span className={styles.imageBox} style={asset && bounds ? {
      width: `${asset.width / bounds.width * 100}%`, height: `${asset.height / bounds.height * 100}%`,
      left: `${-bounds.x / bounds.width * 100}%`, top: `${-bounds.y / bounds.height * 100}%`,
    } : { inset: 0 }}>
      {ready && <Image src={src} alt={product.nameAr} fill sizes={sizes} preload={preload}
        loading={eager && !preload ? 'eager' : undefined}
        className={asset ? undefined : styles.plainImage} onLoad={event => onLoad?.(event.currentTarget)} />}
    </span>
  </span>
}
