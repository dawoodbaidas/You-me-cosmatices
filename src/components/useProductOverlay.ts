'use client'

import { useSyncExternalStore } from 'react'

const CHANGE = 'store:product-overlay'
const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener)
  window.addEventListener('hashchange', listener)
  window.addEventListener(CHANGE, listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener('hashchange', listener)
    window.removeEventListener(CHANGE, listener)
  }
}
function current() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  return hash.get('product')
}

// Overlay history is URL-fragment state, not a different server-rendered query.
// This keeps renderedSearch and the router's cached page payload in agreement
// when a catalogue revision refresh happens while the overlay is open.
export function useProductOverlay() {
  const slug = useSyncExternalStore(subscribe, current, () => null)
  const open = (product: string) => {
    const url = new URL(window.location.href)
    url.hash = new URLSearchParams({ product }).toString()
    window.history.pushState({ ...window.history.state, storeProductOverlay: true }, '', url)
    window.dispatchEvent(new Event(CHANGE))
  }
  const close = () => {
    if (window.history.state?.storeProductOverlay) window.history.back()
    else {
      const url = new URL(window.location.href); url.hash = ''
      window.history.replaceState({ ...window.history.state, storeProductOverlay:false }, '', url)
      window.dispatchEvent(new Event(CHANGE))
    }
  }
  return { slug, open, close }
}
