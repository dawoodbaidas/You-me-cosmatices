'use client'

import Image from 'next/image'
import { useState } from 'react'
import { BagIcon } from './icons'

/** One uncropped image in a reserved frame, in navigation, cards and admin. */
export default function CategoryImage({ src, alt, sizes, eager = false }: {
  src: string | null; alt: string; sizes: string; eager?: boolean
}) {
  const [failed, setFailed] = useState<string | null>(null)
  return !src || failed === src
    ? <span className="product-image-fallback" role="img" aria-label={alt}><BagIcon /></span>
    : <Image src={src} alt={alt} fill sizes={sizes} loading={eager ? 'eager' : 'lazy'}
        unoptimized={src.startsWith('blob:')} style={{ objectFit: 'contain', objectPosition: 'center', padding: '12%' }}
        onError={() => setFailed(src)} />
}
