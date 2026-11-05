import { formatJod } from '@/lib/format'
import { cartShipping } from '@/lib/cart'
import type { CartLine, SiteSettings } from '@/types/product'

/** Digits-safe WhatsApp href — digits only, no "+" or spaces. */
export function whatsappNumber(value: string) {
  return value.replace(/[^\d]/g, '')
}

export function whatsappLink(number: string, message: string) {
  return `https://wa.me/${whatsappNumber(number)}?text=${encodeURIComponent(message)}`
}

/**
 * Keep order quantities and prices consistent with the storefront.
 */
export function buildOrderMessage(
  lines: (Pick<CartLine, 'quantity' | 'unitPrice' | 'lineTotal'> & { product: { nameAr: string }; variant: { label: string } | null })[],
  settings: SiteSettings,
): string {
  const currency = settings.currency
  const body: string[] = [
    settings.whatsappMessage || 'مرحباً You&Me Cosmetics 💘',
    'أرغب بطلب المنتجات التالية:',
    '',
  ]

  lines.forEach((line, index) => {
    const name = line.variant ? `${line.product.nameAr} (${line.variant.label})` : line.product.nameAr
    body.push(
      `${index + 1}. ${name} - الكمية: ${line.quantity} × ${formatJod(line.unitPrice, currency)} = ${formatJod(
        line.lineTotal,
        currency,
      )}`,
    )
  })

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const shipping = cartShipping(total, settings)

  body.push(
    '',
    `المجموع الفرعي: ${formatJod(total, currency)}`,
    `التوصيل: ${shipping === undefined ? 'يُحدد عند تأكيد الطلب' : shipping === 0 ? 'مجاني' : formatJod(shipping, currency)}`,
    `${shipping === undefined ? 'مجموع المنتجات دون التوصيل' : 'الإجمالي'}: ${formatJod(total + (shipping ?? 0), currency)}`,
    '',
    'بيانات التوصيل:',
    'الاسم: ',
    'العنوان: ',
    'رقم الهاتف: ',
    '',
    'شكراً لكم 💕',
  )

  return body.join('\n')
}
