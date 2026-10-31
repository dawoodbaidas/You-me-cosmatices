'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'

export default function BoutiqueDialog({ open, onClose, label, className, children }: {
  open: boolean
  onClose: () => void
  label: string
  className: string
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closing = useRef(false)
  const close = () => {
    if (closing.current) return
    closing.current = true
    const sheet = dialog.current?.firstElementChild
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const transform = className === 'cart-dialog' ? 'translateX(100%)' : 'translateY(16px) scale(.97)'
    const animation = sheet?.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform }], { duration: reduced ? 0 : 320, easing: 'ease-in', fill: 'forwards' })
    Promise.resolve(animation?.finished).then(() => { closing.current = false; onClose() }, () => { closing.current = false })
  }
  useLayoutEffect(() => {
    const element = dialog.current
    if (!element || !open) return
    const previous = document.body.style.overflow
    const focused = document.activeElement as HTMLElement | null
    element.showModal()
    const sheet = element.firstElementChild
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = className === 'cart-dialog' ? 'translateX(100%)' : 'translateY(16px) scale(.97)'
    sheet?.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: reduced ? 0 : 320, easing: 'cubic-bezier(.22,1,.36,1)' })
    document.body.style.overflow = 'hidden'
    return () => {
      sheet?.getAnimations().forEach(animation => animation.cancel())
      element.close()
      document.body.style.overflow = previous
      focused?.focus({ preventScroll: true })
    }
  }, [open, className])
  return <dialog ref={dialog} className={`boutique-dialog ${className}`} aria-label={label} aria-modal="true" onClickCapture={event => {
    const button = (event.target as HTMLElement).closest('button')
    if (button?.classList.contains('quickview-close') || button?.closest('.cart-heading')) { event.stopPropagation(); close() }
  }} onCancel={event => { event.preventDefault(); close() }} onKeyDown={event => {
    if (event.key !== 'Tab') return
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0)
    const target = event.shiftKey ? controls.at(-1) : controls[0]
    const boundary = event.shiftKey ? controls[0] : controls.at(-1)
    if (target && document.activeElement === boundary) {
      event.preventDefault()
      target.focus()
    }
  }} onClick={event => { if (event.target === event.currentTarget) close() }}>{children}</dialog>
}
