'use client'

import Image from 'next/image'
import { sceneAssets } from '@/lib/scene-products'
import type { Product } from '@/types/product'
import styles from './scroll-scenes.module.css'

export default function SceneProductImage({ product, preload = false, eager = false, sizes = '(max-width:599px) 260px, 420px', onLoad }: {
  product: Product; preload?: boolean; eager?: boolean; sizes?: string; onLoad?: (image: HTMLImageElement) => void
}) {
  const asset = sceneAssets[product.slug]
  const bounds = asset?.bounds
  const src = asset?.src ?? product.imageUrl
  if (!src) return null
  return <span className={styles.cutout} style={{ aspectRatio: String(bounds ? bounds.width / bounds.height : 4 / 5) }}>
    <span className={styles.imageBox} style={asset && bounds ? {
      width: `${asset.width / bounds.width * 100}%`, height: `${asset.height / bounds.height * 100}%`,
      left: `${-bounds.x / bounds.width * 100}%`, top: `${-bounds.y / bounds.height * 100}%`,
    } : { inset: 0 }}>
      <Image src={src} alt={product.nameAr} fill sizes={sizes} preload={preload}
        loading={eager && !preload ? 'eager' : undefined}
        className={asset ? undefined : styles.plainImage} onLoad={event => onLoad?.(event.currentTarget)} />
    </span>
  </span>
}
