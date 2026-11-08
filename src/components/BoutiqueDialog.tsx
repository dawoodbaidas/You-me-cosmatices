'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export default function BoutiqueDialog({ open, onClose, label, className, children, side }: {
  side?: 'left' | 'right'
  open: boolean
  onClose: () => void
  label: string
  className: string
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => {
    // Release the modal immediately; closing must not delay the next action.
    onClose()
  }
  useLayoutEffect(() => {
    const element = dialog.current
    if (!element || !open) return
    const previous = document.body.style.overflow
    const previousPadding = document.body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    const focused = document.activeElement as HTMLElement | null
    element.showModal()
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
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`
    document.body.style.overflow = 'hidden'
    return () => {
      sheet?.getAnimations().forEach(animation => animation.cancel())
      element.close()
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', resize)
      document.body.style.overflow = previous
      document.body.style.paddingRight = previousPadding
      focused?.focus({ preventScroll: true })
    }
  }, [open, className, side])
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
  return side ? open && typeof document !== 'undefined' ? createPortal(<div className="boutique">{content}</div>, document.body) : null : content
}
