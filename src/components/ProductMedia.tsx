'use client'

import CachedProductImage from './CachedProductImage'
import { useEffect, useRef, useState } from 'react'
import { BagIcon } from './icons'
import { cachedProductFrame, measureProductFrame, saveProductFrame } from '@/lib/product-framing'

// Keep the reserved image box; failed/missing database URLs get a neutral state.
export default function ProductMedia({ src, alt, sizes, eager = false, listing = false, defer = false, mode = 'auto' }: {
  src: string | null; alt: string; sizes: string; eager?: boolean; listing?: boolean; defer?: boolean; mode?: 'auto' | 'contain' | 'cover'
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const frame = useRef<HTMLSpanElement>(null)
  const imageBox = useRef<HTMLSpanElement>(null)
  const fit = useRef<() => void>(() => {})
  const [nearby, setNearby] = useState(!defer || eager)
  useEffect(() => {
    if (nearby || !frame.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearby(true); observer.disconnect() }
    }, { rootMargin: '400px 0px' })
    observer.observe(frame.current)
    return () => observer.disconnect()
  }, [nearby])
  useEffect(() => {
    if(!frame.current)return
    const observer=new ResizeObserver(()=>fit.current())
    observer.observe(frame.current)
    return ()=>{ observer.disconnect(); fit.current=()=>{} }
  }, [src])
  const loaded = (image: HTMLImageElement) => {
    if(!src||!frame.current)return
    let measured=cachedProductFrame(src)
    if(!measured) {
      try {
        const canvas=document.createElement('canvas'), scale=Math.min(1,256/Math.max(image.naturalWidth,image.naturalHeight))
        canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale))
        const context=canvas.getContext('2d',{willReadFrequently:true})!
        context.drawImage(image,0,0,canvas.width,canvas.height)
        measured=measureProductFrame(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height)
        saveProductFrame(src,measured)
      } catch { /* Unreadable pixels: show the entire original without guessing. */ }
    }
    frame.current.dataset.imageKind=measured?.transparent?'transparent':'original'
    frame.current.style.background=measured?.background??'url(/brand/product-ivory.jpeg) center / cover no-repeat'
    const data=measured
    fit.current=()=>{
      if(!frame.current||!imageBox.current||!data)return
      const width=frame.current.clientWidth,height=frame.current.clientHeight,{subject}=data
      const scale=Math.min(width/subject.width,height/subject.height)*(data.transparent ? .9 : 1)
      Object.assign(imageBox.current.style,{
        inset:'auto',width:`${data.width*scale}px`,height:`${data.height*scale}px`,
        left:`${(width-subject.width*scale)/2-subject.x*scale}px`,top:`${(height-subject.height*scale)/2-subject.y*scale}px`,
      })
    }
    fit.current()
  }
  return <span ref={frame} data-media-listing={listing || undefined} style={{ position: 'absolute', inset: 0, overflow:'hidden', background: 'url(/brand/product-ivory.jpeg) center / cover no-repeat' }}>
    {(!src || failed === src) ? <span className="product-image-fallback" role="img" aria-label={alt}>
      <BagIcon /><span>الصورة غير متاحة</span>
    </span> : nearby ? <span key={src} ref={imageBox} data-product-image-box style={{position:'absolute',inset:0}}><CachedProductImage src={src} alt={alt} sizes={sizes}
      style={{ objectFit: mode === 'cover' ? 'cover' : 'contain', objectPosition: 'center', padding: 0 }}
      onLoad={loaded}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'}
      onError={() => setFailed(src)} /></span> : null}
  </span>
}
