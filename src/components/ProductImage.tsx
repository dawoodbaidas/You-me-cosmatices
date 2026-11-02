'use client'

import Image from 'next/image'
import { useState } from 'react'
import { BagIcon } from './icons'

// Keep the reserved image box; failed/missing database URLs get a neutral state.
export default function ProductImage({ src, alt, sizes, eager = false }: {
  src: string | null; alt: string; sizes: string; eager?: boolean
}) {
  const [failed, setFailed] = useState<string | null>(null)
  return <>
    {(!src || failed === src) ? <span className="product-image-fallback" role="img" aria-label={alt}>
      <BagIcon /><span>الصورة غير متاحة</span>
    </span> : <Image src={src} alt={alt} fill sizes={sizes} quality={90}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'}
      onError={() => setFailed(src)} />}
  </>
}
