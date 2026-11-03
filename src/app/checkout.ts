'use server'

import { readStoreCatalogue } from '@/lib/store-catalogue'
import { checkoutLines } from '@/lib/checkout'
import { buildOrderMessage, whatsappLink } from '@/lib/whatsapp'

export async function prepareCheckout(input: unknown) {
  try {
    // Bypass the display cache: only current server prices enter the order message.
    const store = await readStoreCatalogue(true)
    if (store.unavailable || !store.revision || !store.settings.whatsappNumber) return { error: 'تعذّر التحقق من الطلب. حاول مجددًا.' }
    const lines = checkoutLines(input, store.products)
    return { url: whatsappLink(store.settings.whatsappNumber, buildOrderMessage(lines, store.settings)) }
  } catch {
    return { error: 'تغيّر المخزون أو المنتج. حدّث المتجر وراجع السلة قبل إتمام الطلب.' }
  }
}
