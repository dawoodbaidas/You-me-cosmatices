'use client'

import { useEffect } from 'react'

// Only the catalogue owns wheel smoothing. Touch, keyboard, nested scrollers,
// browser zoom and the two editorial scenes always use their native behavior.
export default function StoreScroll() {
  useEffect(() => {
    const media = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    let target = 0, lastWheel = 0, smoothing = false
    const cancel = () => {
      if (smoothing) window.scrollTo({ top: scrollY, behavior: 'instant' })
      smoothing = false
      lastWheel = 0
    }
    const wheel = (event: WheelEvent) => {
      if (!media.matches || !event.cancelable || event.ctrlKey || event.metaKey || event.altKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
      const element = event.target instanceof Element ? event.target : null
      const shop = element?.closest<HTMLElement>('#shop')
      if (!shop || element?.closest('dialog, input, textarea, select, [contenteditable="true"]')) return
      for (let node = element; node && node !== shop; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return
      }
      const top = shop.getBoundingClientRect().top + scrollY
      const header = document.querySelector('.shop-header')?.getBoundingClientRect().height ?? 0
      // Never animate across the boundary back into a protected homepage scene.
      const min = document.getElementById('home') ? top - header : 0
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1) * .85
      const now = performance.now()
      const continuing = smoothing && now - lastWheel < 160 && Math.sign(delta) === Math.sign(target - scrollY)
      const proposed = (continuing ? target : scrollY) + delta
      const max = document.documentElement.scrollHeight - innerHeight
      if (scrollY < min || proposed <= min || proposed >= max) { cancel(); return }
      event.preventDefault()
      target = proposed
      lastWheel = now
      smoothing = true
      // Let the browser animate and interrupt scrolling; no scroll-jacking RAF loop.
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
    const key = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab'].includes(event.key)) cancel()
    }
    const update = () => {
      cancel()
      window.removeEventListener('wheel', wheel)
      if (media.matches) window.addEventListener('wheel', wheel, { passive: false })
    }
    update()
    media.addEventListener('change', update)
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', cancel)
    window.addEventListener('store:navigate', cancel)
    return () => {
      cancel()
      media.removeEventListener('change', update)
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', key)
      window.removeEventListener('pointerdown', cancel)
      window.removeEventListener('store:navigate', cancel)
    }
  }, [])
  return null
}
