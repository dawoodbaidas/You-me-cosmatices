export interface OrderSnapshot {
  id: string
  lines: { productId: string; variantId: string | null; nameAr: string; variantLabel: string | null; quantity: number; unitPrice: number }[]
  subtotal: number
  shipping: number | null
  total: number
  currency: string
  whatsappNumber: string
  whatsappMessage: string
  changed?: boolean
}

export interface CheckoutExpectation { id: string; unitPrices: number[]; total: number }
export interface CheckoutResult { url?: string; error?: string; confirmation?: OrderSnapshot }
