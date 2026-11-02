'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  addToCart,
  readStoredCart,
  readStoredFavorites,
  removeFromCart,
  setCartQuantity,
  writeStoredCart,
  writeStoredFavorites,
} from '@/lib/cart'
import type { CartItem } from '@/types/product'

/**
 * `useSyncExternalStore` instead of `useState` + `useEffect` so localStorage is
 * read lazily on the client, the server always renders the empty state, and
 * React never has to reconcile a hydration mismatch on the cart badge.
 */
function createPersistedStore<T>(storageKey: string, load: () => T, save: (value: T) => void, fallback: T) {
  const listeners = new Set<() => void>()
  let cache: T = fallback
  let loaded = false

  const ensureLoaded = () => {
    if (loaded) return
    loaded = true
    cache = load()
  }

  const emit = () => {
    for (const listener of listeners) listener()
  }

  return {
    subscribe(listener: () => void) {
      if (typeof window === 'undefined') return () => {}
      ensureLoaded()
      listeners.add(listener)

      const onStorage = (event: StorageEvent) => {
        if (event.key !== null && event.key !== storageKey) return
        loaded = false
        ensureLoaded()
        emit()
      }

      window.addEventListener('storage', onStorage)
      return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', onStorage)
      }
    },
    getSnapshot() {
      if (typeof window === 'undefined') return fallback
      ensureLoaded()
      return cache
    },
    getServerSnapshot() {
      return fallback
    },
    set(next: T) {
      ensureLoaded()
      cache = next
      save(next)
      emit()
    },
  }
}

const EMPTY_CART: CartItem[] = []
const EMPTY_FAVORITES: string[] = []

const cartStore = createPersistedStore<CartItem[]>(
  'you-and-me-cart-v1',
  () => readStoredCart(window.localStorage),
  (value) => writeStoredCart(window.localStorage, value),
  EMPTY_CART,
)

const favoritesStore = createPersistedStore<string[]>(
  'you-and-me-favorites-v1',
  () => readStoredFavorites(window.localStorage),
  (value) => writeStoredFavorites(window.localStorage, value),
  EMPTY_FAVORITES,
)

export function useCartStore() {
  const items = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  )

  const actions = useMemo(
    () => ({
      add: (productId: string, variantId: string | null, quantity = 1) =>
        cartStore.set(addToCart(itemsRef(), productId, variantId, quantity)),
      setQuantity: (productId: string, variantId: string | null, quantity: number) =>
        cartStore.set(setCartQuantity(itemsRef(), productId, variantId, quantity)),
      remove: (productId: string, variantId: string | null) =>
        cartStore.set(removeFromCart(itemsRef(), productId, variantId)),
      replace: cartStore.set,
      snapshot: cartStore.getSnapshot,
    }),
    [],
  )

  return [items, actions] as const
}

export function useFavoritesStore() {
  const favorites = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getSnapshot,
    favoritesStore.getServerSnapshot,
  )

  const toggle = useMemo(
    () => (productId: string) => {
      const current = favoritesStore.getSnapshot()
      const exists = current.includes(productId)
      favoritesStore.set(
        exists ? current.filter((id) => id !== productId) : [...current, productId],
      )
      return !exists
    },
    [],
  )

  return [favorites, toggle] as const
}

const itemsRef = cartStore.getSnapshot
