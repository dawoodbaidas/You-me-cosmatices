'use client'

import { useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export default function BoutiqueDialog({ open, onClose, label, className, children, side }: {
  side?: 'left' | 'right'
  open: boolean
  onClose: () => void
  label: string
  className: string
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  const close = () => {
    // Release the modal immediately; closing must not delay the next action.
    onClose()
  }
  useLayoutEffect(() => {
    const element = dialog.current
    if (!element || !open) return
    // Lock the document scroller without turning body into a new sticky
    // containing block or changing the hero's available width.
    const scroller = document.documentElement
    const previous = scroller.style.overflow
    const previousGutter = scroller.style.scrollbarGutter
    const position = { left: window.scrollX, top: window.scrollY }
    const focused = document.activeElement as HTMLElement | null
    scroller.style.scrollbarGutter = 'stable'
    scroller.style.overflow = 'hidden'
    element.showModal()
    window.scrollTo({ ...position, behavior: 'instant' })
    const viewport = window.visualViewport
    const resize = () => {
      element.style.setProperty('--dialog-height', `${viewport?.height ?? window.innerHeight}px`)
      element.style.setProperty('--dialog-top', `${viewport?.offsetTop ?? 0}px`)
    }
    resize()
    viewport?.addEventListener('resize', resize)
    viewport?.addEventListener('scroll', resize)
    element.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus({ preventScroll: true })
    const sheet = element.firstElementChild
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = side ? `translateX(${side === 'left' ? '-100%' : '100%'})` : 'translateY(16px) scale(.97)'
    sheet?.animate([{ opacity: 1, transform: from }, { opacity: 1, transform: 'none' }], { duration: reduced ? 0 : side ? 220 : 120, easing: 'ease-out' })
    if (side) element.querySelector<HTMLElement>('button:not(:disabled)')?.focus({ preventScroll: true })
    return () => {
      sheet?.getAnimations().forEach(animation => animation.cancel())
      element.close()
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', resize)
      scroller.style.overflow = previous
      scroller.style.scrollbarGutter = previousGutter
      if (focused?.isConnected) focused.focus({ preventScroll: true })
      window.scrollTo({ ...position, behavior: 'instant' })
    }
  }, [open, className, side, mounted])
  const content = <dialog ref={dialog} data-side={side} className={`boutique-dialog ${className}`} aria-label={label} aria-modal="true" onClickCapture={event => {
    const button = (event.target as HTMLElement).closest('button')
    if (button?.classList.contains('quickview-close') || button?.closest('.cart-heading')) { event.stopPropagation(); close() }
  }} onCancel={event => { event.preventDefault(); close() }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (event.key !== 'Tab') return
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0)
    const target = event.shiftKey ? controls.at(-1) : controls[0]
    const boundary = event.shiftKey ? controls[0] : controls.at(-1)
    if (target && document.activeElement === boundary) {
      event.preventDefault()
      target.focus()
    }
  }} onClick={event => { if (event.target === event.currentTarget) close() }}>{children}</dialog>
  return mounted && open ? createPortal(<div className="boutique" data-dialog-portal>{content}</div>, document.body) : null
}
