'use client'

import Image from 'next/image'
import { useState } from 'react'
import { BagIcon } from './icons'

// Keep the reserved image box; failed/missing database URLs get a neutral state.
export default function ProductImage({ src, alt, sizes, eager = false, listing = false }: {
  src: string | null; alt: string; sizes: string; eager?: boolean; listing?: boolean
}) {
  const [failed, setFailed] = useState<string | null>(null)
  return <>
    {(!src || failed === src) ? <span className="product-image-fallback" role="img" aria-label={alt}>
      <BagIcon /><span>الصورة غير متاحة</span>
    </span> : listing ? (
      // Explicit candidates preserve truthful width descriptors with capped delivery.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/_next/image?url=${encodeURIComponent(src)}&w=828&q=75`}
        srcSet={[256, 384, 640, 750, 828].map(width => `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75 ${width}w`).join(', ')}
        sizes={sizes} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'}
        decoding="async" onError={() => setFailed(src)} />
    ) : <Image src={src} alt={alt} fill sizes={sizes} quality={90}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'}
      onError={() => setFailed(src)} />}
  </>
}
