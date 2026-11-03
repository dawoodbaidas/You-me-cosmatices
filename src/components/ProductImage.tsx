'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { BagIcon } from './icons'

// Keep the reserved image box; failed/missing database URLs get a neutral state.
export default function ProductImage({ src, alt, sizes, eager = false, listing = false, defer = false }: {
  src: string | null; alt: string; sizes: string; eager?: boolean; listing?: boolean; defer?: boolean
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
  return <span ref={frame} style={{ position: 'absolute', inset: 0 }}>
    {(!src || failed === src) ? <span className="product-image-fallback" role="img" aria-label={alt}>
      <BagIcon /><span>الصورة غير متاحة</span>
    </span> : nearby ? <Image src={src} alt={alt} fill sizes={sizes} quality={listing ? 70 : 90}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'}
      onError={() => setFailed(src)} /> : null}
  </span>
}
