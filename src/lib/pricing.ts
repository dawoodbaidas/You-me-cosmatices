import type { Product, ProductVariant } from '@/types/product'

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000

export function productPricing(product: Product, variant?: ProductVariant | null) {
  const original = product.originalPrice ?? product.oldPrice ?? product.price
  const discounted = (product.discountEnabled ?? (product.oldPrice != null)) && original > 0 && product.price >= 0 && product.price < original
  const regular = variant?.price ?? original
  let price = variant?.price ?? product.price
  if (variant && discounted && product.discountEnabled === true) {
    // Integer arithmetic matches PostgreSQL's exact half-up rounding to 0.001.
    const numerator = BigInt(Math.round(regular * 1000)) * BigInt(Math.round(product.price * 1000))
    const denominator = BigInt(Math.round(original * 1000))
    price = Number((BigInt(2) * numerator + denominator) / (BigInt(2) * denominator)) / 1000
  }
  return { price, oldPrice: discounted ? regular : null, discount: discounted ? Number(((1 - product.price / original) * 100).toPrecision(3)) : null }
}
