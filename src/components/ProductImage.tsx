'use client'

import Image from 'next/image'
import { useState } from 'react'
import { BagIcon } from './icons'

// Preserve the image box while loading; retry the source if optimization fails.
export default function ProductImage({ src, alt, sizes, eager = false }: {
  src: string | null; alt: string; sizes: string; eager?: boolean
}) {
  const [failure, setFailure] = useState<'optimized' | 'source' | null>(null)
  return <>
    {(!src || failure === 'source') ? <span className="product-image-fallback" role="img" aria-label={alt}>
      <BagIcon /><span>الصورة غير متاحة</span>
    </span> : <Image src={src} alt={alt} fill sizes={sizes}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'}
      unoptimized={failure === 'optimized' || (src.startsWith('/products/') && src.endsWith('.webp'))}
      onError={() => setFailure(failure === null ? 'optimized' : 'source')} />}
  </>
}
