'use server'

import { readStoreCatalogue } from '@/lib/store-catalogue'
import { checkoutLines } from '@/lib/checkout'
import { buildOrderMessage, whatsappLink } from '@/lib/whatsapp'
import { createClient } from '@/lib/supabase/server'
import { UUID } from '@/lib/products/editor'
import { roundMoney } from '@/lib/pricing'
import type { CheckoutExpectation, CheckoutResult, OrderSnapshot } from '@/lib/order'

export async function prepareCheckout(input: unknown, expected: CheckoutExpectation): Promise<CheckoutResult> {
  try {
    if (!expected || !UUID.test(expected.id) || !Array.isArray(expected.unitPrices) || expected.unitPrices.some(price => !Number.isFinite(price) || price < 0) || !Number.isFinite(expected.total) || expected.total < 0) return { error: 'راجع السلة قبل إتمام الطلب.' }
    // Bypass the display cache: only current server prices enter the order message.
    const store = await readStoreCatalogue(true)
    if (store.unavailable || !store.revision || !store.settings.whatsappNumber) return { error: 'تعذّر التحقق من الطلب. حاول مجددًا.' }
    const lines = checkoutLines(input, store.products)
    if (lines.length !== expected.unitPrices.length) return { error: 'تغيّرت السلة. حدّث الصفحة وراجعها.' }
    const client = await createClient()
    const { data, error } = await client.rpc('create_store_order', {
      p_id: expected.id,
      p_lines: lines.map((line, index) => ({ productId: line.product.id, variantId: line.variant?.id ?? null, quantity: line.quantity, unitPrice: expected.unitPrices[index] })),
      p_expected_total: expected.total,
    })
    if (error || !data) return { error: 'تعذّر تثبيت أسعار الطلب. حدّث السلة وحاول مجدداً.' }
    const order = data as OrderSnapshot
    if (order.changed) return { confirmation: order }
    const orderLines = order.lines.map(line => ({ product: { nameAr: line.nameAr }, variant: line.variantLabel ? { label: line.variantLabel } : null, quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: roundMoney(line.unitPrice * line.quantity) }))
    const settings = { ...store.settings, currency: order.currency, whatsappNumber: order.whatsappNumber, whatsappMessage: order.whatsappMessage, storeFreeShippingThreshold: 0, storeShippingFee: order.shipping ?? undefined }
    return { url: whatsappLink(order.whatsappNumber, `رقم الطلب: ${order.id}\n` + buildOrderMessage(orderLines, settings)) }
  } catch {
    return { error: 'تغيّر المخزون أو المنتج. حدّث المتجر وراجع السلة قبل إتمام الطلب.' }
  }
}
