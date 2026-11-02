'use client'

import { AlertIcon, CheckIcon } from '@/components/icons'

export interface ToastMessage {
  id: number
  text: string
  tone: 'success' | 'error'
}

/** Single floating toast, matching the original `slideUp` animation. */
export default function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null

  return <div className="boutique-toast-wrap">
    <div role="status" aria-live="polite" className={`boutique-toast ${toast.tone === 'error' ? 'is-error' : ''}`}>
      {toast.tone === 'error' ? <AlertIcon /> : <CheckIcon />}
      <span>{toast.text}</span>
    </div>
  </div>
}
