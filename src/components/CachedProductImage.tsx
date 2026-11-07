'use client'

import Image, { getImageProps, type ImageProps } from 'next/image'
import { useState } from 'react'
import { loadedProductImage, rememberProductImage, PRODUCT_IMAGE_QUALITY, PRODUCT_IMAGE_SIZES } from '@/lib/product-media'

type Props = Omit<ImageProps, 'src' | 'onLoad' | 'onError' | 'quality' | 'fill'> & {
  src: string; onLoad?: (image: HTMLImageElement) => void; onError?: () => void
}

export function prefetchProductDetails(src: string | null) {
  if (!src || typeof window === 'undefined' || loadedProductImage(src)) return
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches || pending.has(src)) return
  const image = new window.Image()
  const { props } = getImageProps({ src, alt: '', fill: true, sizes: PRODUCT_IMAGE_SIZES.detail, quality: PRODUCT_IMAGE_QUALITY })
  pending.add(src)
  image.onload = () => {
    void image.decode().then(() => rememberProductImage(src, { currentSrc: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight })).catch(() => {}).finally(() => pending.delete(src))
  }
  image.onerror = () => pending.delete(src)
  image.sizes = props.sizes ?? ''
  image.srcset = props.srcSet ?? ''
  image.src = props.src
}
const pending = new Set<string>()

// Source identity owns the handoff state: replacing a URL never shows old artwork.
export default function CachedProductImage(props: Props) { return <SourceImage key={props.src} {...props} /> }

function SourceImage({ src, onLoad, onError, style, ...props }: Props) {
  const [preview] = useState(() => loadedProductImage(src))
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const pixels = props.sizes === PRODUCT_IMAGE_SIZES.cart
    ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 88 : 148)
    : /^\d+px$/.test(props.sizes ?? '') ? Number.parseInt(props.sizes!) : null
  // Reuse a larger cached rendition directly for fixed-size cart thumbnails.
  const sufficient = preview && pixels !== null && preview.width >= pixels * (typeof window === 'undefined' ? 1 : window.devicePixelRatio)
  return <>
    {preview && !ready && <Image src={preview.currentSrc} alt={props.alt} fill unoptimized
      className={props.className} style={style} loading="eager" data-image-preview="true"
      onLoad={event => { if (sufficient) onLoad?.(event.currentTarget) }}
      onError={() => { if (sufficient) onError?.() }} />}
    {!sufficient && !(failed && preview) && <Image {...props} alt={preview && !ready ? '' : props.alt} src={src} fill quality={PRODUCT_IMAGE_QUALITY}
      style={{ ...style, ...(preview && !ready ? { opacity: 0 } : {}) }}
      onLoad={event => {
        const image = event.currentTarget
        // Next Image calls onLoad after decode; do not decode the same image again.
        rememberProductImage(src, { currentSrc: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight })
        setReady(true)
        onLoad?.(image)
      }} onError={() => { setFailed(true); if (!preview) onError?.() }} />}
  </>
}
