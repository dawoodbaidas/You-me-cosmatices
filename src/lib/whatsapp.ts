import { formatJod } from '@/lib/format'
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
  lines: CartLine[],
  settings: SiteSettings,
): string {
  const currency = settings.currency
  const body: string[] = [
    settings.whatsappMessage || 'مرحباً You and Me Cosmetics 💘',
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

  body.push(
    '',
    `المجموع الكلي: ${formatJod(total, currency)}`,
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
