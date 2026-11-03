import { canCheckoutCart, resolveCart } from './cart'
import type { CartItem, Product } from '@/types/product'

export function checkoutLines(input: unknown, products: Product[]) {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw new Error('Invalid cart')
  const keys = new Set<string>()
  for (const item of input) {
    if (!item || typeof item.productId !== 'string' || !item.productId || item.productId.length > 128
      || (item.variantId !== null && (typeof item.variantId !== 'string' || !item.variantId || item.variantId.length > 128))
      || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error('Invalid cart')
    const key = JSON.stringify([item.productId, item.variantId])
    if (keys.has(key)) throw new Error('Duplicate cart line')
    keys.add(key)
  }
  const lines = resolveCart(input as CartItem[], products)
  if (lines.length !== input.length || !canCheckoutCart(lines)) throw new Error('Cart unavailable')
  return lines
}
