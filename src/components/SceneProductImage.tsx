'use client'

import CachedProductImage from './CachedProductImage'
import { useEffect, useRef, useState } from 'react'
import { productSceneAsset } from '@/lib/scene-products'
import { mobileSubjectScale } from '@/lib/mobile-scene-geometry'
import type { Product } from '@/types/product'
import styles from './scroll-scenes.module.css'
import { productImageFrame, rememberProductImageFrame } from '@/lib/product-media'

export default function SceneProductImage({ product, preload = false, eager = false, sizes = '(max-width:599px) 260px, 420px', onLoad, mobileWeight }: {
  product: Product; preload?: boolean; eager?: boolean; sizes?: string; onLoad?: (image: HTMLImageElement) => void; mobileWeight?: number
}) {
  const frame = useRef<HTMLSpanElement>(null)
  const imageBox = useRef<HTMLSpanElement>(null)
  const fit = useRef<() => void>(() => {})
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
  useEffect(() => {
    if (!frame.current) return
    const observer = new ResizeObserver(() => fit.current())
    observer.observe(frame.current)
    return () => { observer.disconnect(); fit.current = () => {} }
  }, [src])
  if (!src) return null
  const loaded = (image: HTMLImageElement) => {
    // Display-only framing of transparent padding. Never alters the stored image,
    // removes background pixels, or guesses at an opaque photograph's subject.
    const cached = productImageFrame(src)
    let width = cached?.width ?? asset?.width ?? image.naturalWidth, height = cached?.height ?? asset?.height ?? image.naturalHeight
    let subject = cached?.subject ?? bounds ?? { x: 0, y: 0, width, height }
    if (!asset && !cached) {
      try {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 256 / Math.max(width, height))
        canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale))
        const context = canvas.getContext('2d', { willReadFrequently: true })!
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
        let left = canvas.width, top = canvas.height, right = -1, bottom = -1
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] > 0) {
            left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y)
          }
        }
        if (right >= left) {
          width = canvas.width; height = canvas.height
          subject = { x: Math.max(0, left - 1), y: Math.max(0, top - 1), width: Math.min(width, right + 2) - Math.max(0, left - 1), height: Math.min(height, bottom + 2) - Math.max(0, top - 1) }
        }
      } catch { /* Cross-origin/unsupported canvas: keep the complete image. */ }
    }
    if (!cached) rememberProductImageFrame(src, { width, height, subject })
    fit.current = () => {
      if (!frame.current || !imageBox.current) return
      const w = frame.current.clientWidth, h = frame.current.clientHeight
      const scale = mobileWeight !== undefined && matchMedia('(max-width: 767px)').matches
        ? mobileSubjectScale(subject.width, subject.height, w, h, mobileWeight)
        : Math.min(w / subject.width, h / subject.height)
      Object.assign(imageBox.current.style, {
        right: 'auto', bottom: 'auto',
        width: `${width * scale}px`, height: `${height * scale}px`,
        left: `${(w - subject.width * scale) / 2 - subject.x * scale}px`,
        top: `${(h - subject.height * scale) / 2 - subject.y * scale}px`,
      })
      image.style.objectFit = 'fill'
    }
    fit.current()
    onLoad?.(image)
  }
  return <span ref={frame} className={styles.cutout} style={{ aspectRatio: String(bounds ? bounds.width / bounds.height : 4 / 5) }}>
    <span ref={imageBox} className={styles.imageBox} style={asset && bounds ? {
      width: `${asset.width / bounds.width * 100}%`, height: `${asset.height / bounds.height * 100}%`,
      left: `${-bounds.x / bounds.width * 100}%`, top: `${-bounds.y / bounds.height * 100}%`,
    } : { inset: 0 }}>
      {ready && <CachedProductImage src={src} alt={product.nameAr} sizes={sizes} preload={preload}
        loading={eager && !preload ? 'eager' : undefined}
        className={asset ? undefined : styles.plainImage} onLoad={loaded} />}
    </span>
  </span>
}
