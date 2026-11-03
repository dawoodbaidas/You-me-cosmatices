'use client'

import { useEffect, useRef } from 'react'
import ProductImage from './ProductImage'
import { coverLens } from '@/lib/cover-lens'
import styles from './ProductCard.module.css'

export default function ProductLens({ src, name, eager, onOpen, defer = false }: { src: string | null; name: string; eager: boolean; defer?: boolean; onOpen: () => void }) {
  const area = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = area.current!
    const lens = root.querySelector<HTMLElement>('[data-lens]')!
    const magnified = lens.firstElementChild as HTMLElement
    let timer: ReturnType<typeof setTimeout> | undefined, frame = 0, active = false, blocked = 0
    let startX = 0, startY = 0, x = 0, y = 0, pointer: number | null = null
    const draw = () => {
      frame = 0
      const img = root.querySelector('img')
      if (!img?.naturalWidth) return
      const rect = root.getBoundingClientRect()
      const px = Math.max(0, Math.min(rect.width, x - rect.left)), py = Math.max(0, Math.min(rect.height, y - rect.top))
      const cover = coverLens(rect.width, rect.height, img.naturalWidth, img.naturalHeight, px, py, getComputedStyle(img).objectFit)
      const left = Math.max(0, Math.min(rect.width - 112, px - 56))
      const visibleTop = Math.max(0, -rect.top)
      const visibleBottom = Math.min(rect.height, window.innerHeight - rect.top)
      const top = Math.max(visibleTop, Math.min(visibleBottom - 112, py - 136 < visibleTop ? py + 24 : py - 136))
      magnified.style.backgroundImage = `url("${img.currentSrc}")`
      magnified.style.width = `${cover.w / 2.4}px`
      magnified.style.height = `${cover.h / 2.4}px`
      magnified.style.transform = `translate(${cover.x}px, ${cover.y}px) scale(2.4)`
      lens.style.transform = `translate(${left}px, ${top}px)`
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw) }
    const stop = () => {
      clearTimeout(timer)
      if (active) blocked = Date.now() + 450
      active = false
      root.removeEventListener('touchmove', touch)
      lens.hidden = true
      if (pointer !== null && root.hasPointerCapture(pointer)) root.releasePointerCapture(pointer)
      pointer = null
      cancelAnimationFrame(frame); frame = 0
    }
    const activate = () => {
      if (!root.querySelector('img')?.naturalWidth) return
      root.addEventListener('touchmove', touch, { passive: false })
      navigator.vibrate?.(8)
      active = true; lens.hidden = false; schedule()
      if (pointer !== null) root.setPointerCapture(pointer)
    }
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      stop(); pointer = e.pointerId; startX = x = e.clientX; startY = y = e.clientY
      timer = setTimeout(activate, 380)
    }
    const move = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY
      if (!active && Math.hypot(x - startX, y - startY) > 10) clearTimeout(timer)
      const rect = root.getBoundingClientRect()
      root.style.setProperty('--mx', `${x - rect.left}px`)
      root.style.setProperty('--my', `${y - rect.top}px`)
      if (active) schedule()
    }
    const touch = (e: TouchEvent) => { if (active) e.preventDefault() }
    const click = (e: MouseEvent) => { if (Date.now() < blocked || active) { e.preventDefault(); e.stopPropagation() } }
    const context = (e: Event) => e.preventDefault()
    root.addEventListener('pointerdown', down); root.addEventListener('pointermove', move)
    root.addEventListener('click', click, true)
    root.addEventListener('contextmenu', context)
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) root.addEventListener(event, stop)
    window.addEventListener('blur', stop); window.addEventListener('pagehide', stop)
    return () => {
      stop(); root.removeEventListener('pointerdown', down); root.removeEventListener('pointermove', move)
      root.removeEventListener('touchmove', touch); root.removeEventListener('click', click, true); root.removeEventListener('contextmenu', context)
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) root.removeEventListener(event, stop)
      window.removeEventListener('blur', stop); window.removeEventListener('pagehide', stop)
    }
  }, [src])
  return <><div ref={area} className={styles.imageArea}>
    <button className={styles.imageButton} onClick={onOpen} aria-label={`عرض تفاصيل ${name}`}><ProductImage src={src} alt={name} eager={eager} defer={defer} listing sizes="(max-width: 599px) calc((100vw - 30px) / 2), (max-width: 767px) calc((100vw - 40px) / 3), (max-width: 1199px) calc((100vw - 52px) / 2), (max-width: 1439px) calc((100vw - 76px) / 3), 455px" /></button>
    <span data-lens hidden className={styles.lens}><span className={styles.magnified} /></span>
  </div></>
}
