import { formatJod } from '@/lib/format'
import type { CartItem, CartLine, Product, SiteSettings } from '@/types/product'

export const CART_STORAGE_KEY = 'you-and-me-cart-v1'

/** NULL stock means tracking was not configured, not that the item is sold out. */
export function cartLineLimit(product: Product, items: CartItem[], variantId: string | null): number {
  if (product.isActive === false || (variantId !== null && !product.variants.some(variant => variant.id === variantId && variant.isActive !== false))) return 0
  if (variantId === null && product.variants.some(variant => variant.isActive !== false)) return 0
  if (product.stockQuantity == null) return 99
  const otherVariants = items.filter(item => item.productId === product.id && item.variantId !== variantId && product.variants.some(variant => variant.id === item.variantId && variant.isActive !== false)).reduce((count, item) => count + item.quantity, 0)
  return Math.max(0, Math.min(99, product.stockQuantity - otherVariants))
}

export function canCheckoutCart(lines: CartLine[]): boolean {
  const items = lines.map(line => ({ productId: line.product.id, variantId: line.variant?.id ?? null, quantity: line.quantity }))
  const quantities = new Map<string, number>()
  for (const line of lines) quantities.set(line.product.id, (quantities.get(line.product.id) ?? 0) + line.quantity)
  return lines.length > 0 && lines.every(line => Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= cartLineLimit(line.product, items, line.variant?.id ?? null) && (line.product.stockQuantity == null || quantities.get(line.product.id)! <= line.product.stockQuantity))
}

/**
 * Joins the stored cart (product id + variant id + quantity only) against the
 * freshly loaded catalogue so every price on screen comes from the database.
 * Lines whose product or variant disappeared are dropped.
 */
export function resolveCart(items: CartItem[], products: Product[]): CartLine[] {
  const byId = new Map(products.map((product) => [product.id, product]))

  const lines: CartLine[] = []

  for (const item of items) {
    const product = byId.get(item.productId)
    if (!product || product.isActive === false) continue

    const variant = item.variantId
      ? (product.variants.find((candidate) => candidate.id === item.variantId && candidate.isActive !== false) ?? null)
      : null

    // A stale variant id must not silently fall back to the base price.
    if (item.variantId && !variant) continue

    const quantity = Math.max(1, Math.floor(item.quantity) || 1)
    const unitPrice = variant ? variant.price : product.price

    lines.push({ product, variant, quantity, unitPrice, lineTotal: unitPrice * quantity })
  }

  return lines
}

export const cartCount = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + line.quantity, 0)

export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + line.lineTotal, 0)

/** Adds a line, merging with an identical product+variant pair. */
export function addToCart(items: CartItem[], productId: string, variantId: string | null, quantity = 1) {
  const index = items.findIndex(
    (item) => item.productId === productId && item.variantId === variantId,
  )

  if (index === -1) return [...items, { productId, variantId, quantity }]

  const next = [...items]
  next[index] = { ...next[index], quantity: next[index].quantity + quantity }
  return next
}

export function setCartQuantity(items: CartItem[], productId: string, variantId: string | null, quantity: number) {
  return items.map((item) =>
    item.productId === productId && item.variantId === variantId
      ? { ...item, quantity: Math.max(1, quantity) }
      : item,
  )
}

export function removeFromCart(items: CartItem[], productId: string, variantId: string | null) {
  return items.filter((item) => !(item.productId === productId && item.variantId === variantId))
}

/** Reads persisted cart state, tolerating corrupt/older payloads. */
export function readStoredCart(storage: Pick<Storage, 'getItem'>): CartItem[] {
  try {
    const raw = storage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return []
      const { productId, variantId, quantity } = entry as Partial<CartItem>
      if (typeof productId !== 'string' || !productId) return []
      return [
        {
          productId,
          variantId: typeof variantId === 'string' && variantId ? variantId : null,
          quantity: typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1,
        },
      ]
    })
  } catch {
    return []
  }
}

export function writeStoredCart(storage: Pick<Storage, 'setItem'>, items: CartItem[]) {
  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Private mode / quota — the cart simply will not persist.
  }
}

const FAVORITES_STORAGE_KEY = 'you-and-me-favorites-v1'

export function readStoredFavorites(storage: Pick<Storage, 'getItem'>): string[] {
  try {
    const raw = storage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writeStoredFavorites(storage: Pick<Storage, 'setItem'>, ids: string[]) {
  try {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Ignore — favourites are a convenience.
  }
}

export const describeLine = (line: CartLine, currency: string) =>
  `${formatJod(line.unitPrice, currency)} × ${line.quantity} = ${formatJod(line.lineTotal, currency)}`

/** Unknown fees stay unknown; a valid reached threshold grants free delivery. */
export function cartShipping(subtotal: number, settings: SiteSettings): number | undefined {
  const threshold = settings.storeFreeShippingThreshold
  if (Number.isFinite(threshold) && threshold > 0 && subtotal >= threshold) return 0
  const fee = settings.storeShippingFee
  return typeof fee === 'number' && Number.isFinite(fee) && fee >= 0 ? fee : undefined
}
