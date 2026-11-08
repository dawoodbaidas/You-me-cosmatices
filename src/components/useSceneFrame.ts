'use client'

import { useCallback, useEffect, useEffectEvent, useRef, type RefObject } from 'react'
import { clamp } from '@/lib/scene-palette'

export type SceneFrame = { progress: number; elapsed: number; reduced: boolean; width: number; height: number }

// Both scenes share one lifecycle: passive input, RAF writes, no offscreen loop.
export function useSceneFrame(root: RefObject<HTMLElement | null>, draw: (frame: SceneFrame) => void, continuous = false) {
  const redraw = useRef<() => void>(() => {})
  // The scene owns its clock, not the identity of a product array or callback.
  // Store/modal updates must use fresh data without replaying the entrance.
  const drawFrame = useEffectEvent(draw)
  useEffect(() => {
    const element = root.current
    if (!element) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0, start = 0, last = 0, elapsed = 0, visible = true, disposed = false
    const render = (time: number) => {
      if (disposed) return
      frame = 0
      if (!start) start = time
      if (last) elapsed += Math.min(time - last, 64)
      last = time
      const rect = element.getBoundingClientRect()
      const pin = element.querySelector<HTMLElement>('[data-scene-pin]')
      const height = pin?.offsetHeight ?? innerHeight
      const progress = clamp(-rect.top / Math.max(1, element.offsetHeight - height))
      drawFrame({ progress, elapsed: elapsed / 1000, reduced: reduced.matches, width: element.clientWidth, height })
      if (continuous && visible && !reduced.matches && !document.hidden) frame = requestAnimationFrame(render)
      else last = 0
    }
    const schedule = () => { if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(render) }
    redraw.current = schedule
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule() })
    observer.observe(element)
    const sizeObserver = new ResizeObserver(schedule)
    sizeObserver.observe(element)
    const pin = element.querySelector<HTMLElement>('[data-scene-pin]')
    if (pin) sizeObserver.observe(pin)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('boutique:layout', schedule)
    element.addEventListener('load', schedule, true)
    document.addEventListener('visibilitychange', schedule)
    reduced.addEventListener('change', schedule)
    schedule()
    return () => {
      disposed = true
      cancelAnimationFrame(frame); observer.disconnect(); sizeObserver.disconnect(); redraw.current = () => {}
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule)
      window.removeEventListener('boutique:layout', schedule); element.removeEventListener('load', schedule, true)
      document.removeEventListener('visibilitychange', schedule); reduced.removeEventListener('change', schedule)
    }
  }, [root, continuous])
  useEffect(() => { redraw.current() }, [draw])
  return useCallback(() => redraw.current(), [])
}
