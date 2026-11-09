'use client'

import CachedProductImage from './CachedProductImage'
import { useEffect, useRef, useState } from 'react'
import { BagIcon } from './icons'

// Keep the reserved image box; failed/missing database URLs get a neutral state.
export default function ProductMedia({ src, alt, sizes, eager = false, listing = false, defer = false, mode = 'auto' }: {
  src: string | null; alt: string; sizes: string; eager?: boolean; listing?: boolean; defer?: boolean; mode?: 'auto' | 'contain' | 'cover'
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const frame = useRef<HTMLSpanElement>(null)
  const [nearby, setNearby] = useState(!defer || eager)
  useEffect(() => {
    if (nearby || !frame.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearby(true); observer.disconnect() }
    }, { rootMargin: '400px 0px' })
    observer.observe(frame.current)
    return () => observer.disconnect()
  }, [nearby])
  return <span ref={frame} data-media-listing={listing || undefined} style={{ position: 'absolute', inset: 0, overflow:'hidden', background: 'url(/brand/product-ivory.jpeg) center / cover no-repeat' }}>
    {(!src || failed === src) ? <span className="product-image-fallback" role="img" aria-label={alt}>
      <BagIcon /><span>الصورة غير متاحة</span>
    </span> : nearby ? <span key={src} data-product-image-box style={{position:'absolute',inset:0}}><CachedProductImage src={src} alt={alt} sizes={sizes}
      style={{ objectFit: mode === 'cover' ? 'cover' : 'contain', objectPosition: 'center', padding: 0 }}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'}
      onError={() => setFailed(src)} /></span> : null}
  </span>
}
