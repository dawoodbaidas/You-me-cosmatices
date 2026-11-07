export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ProductDraft {
  id: string
  updatedAt: string | null
  slug: string
  name_ar: string
  name_en: string
  description: string | null
  category: string
  category_label: string
  price: number
  old_price: number | null
  original_price?: number
  discount_enabled?: boolean
  is_new?: boolean
  badge: string | null
  benefits: string[]
  is_active: boolean
  is_featured: boolean
  sort_order: number
  stock_quantity?: number | null
  is_out_of_stock?: boolean
  category_slugs?: string[]
  variants: { id: string; label: string; price: number; is_active: boolean; sort_order: number }[]
}

export function validateProduct(value: unknown): asserts value is ProductDraft {
  if (!value || typeof value !== 'object') throw new Error('بيانات المنتج غير صالحة.')
  const p = value as ProductDraft
  if (p.is_out_of_stock !== undefined && typeof p.is_out_of_stock !== 'boolean') throw new Error('حالة توفر المنتج غير صالحة.')
  const string = (s: unknown, max: number, required = false) => typeof s === 'string' && s.length <= max && (!required || s.trim().length > 0)
  const price = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100_000 && Math.abs(n * 1000 - Math.round(n * 1000)) < 0.00001
  const order = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && Math.abs(n) <= 2147483647
  if (!string(p.id, 36) || !UUID.test(p.id) || (p.updatedAt !== null && (!string(p.updatedAt, 40) || !Number.isFinite(Date.parse(p.updatedAt))))) throw new Error('معرّف المنتج أو إصدار التعديل غير صالح.')
  if (!string(p.name_ar, 250, true) || !string(p.name_en, 250, true) || !string(p.slug, 200, true) || !/^[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*$/u.test(p.slug)) throw new Error('أدخلي الاسمين ورابطاً مختصراً دون مسافات.')
  if (!string(p.category, 150, true) || !string(p.category_label, 150, true)) throw new Error('اختاري التصنيف وأدخلي اسم التصنيف.')
  if (p.stock_quantity !== undefined && p.stock_quantity !== null && (!Number.isInteger(p.stock_quantity) || p.stock_quantity < 0 || p.stock_quantity > 2147483647)) throw new Error('المخزون يجب أن يكون عدداً صحيحاً غير سالب أو فارغاً إذا لم يُسجّل.')
  if (p.category_slugs !== undefined && (!Array.isArray(p.category_slugs) || p.category_slugs.length > 100 || new Set(p.category_slugs).size !== p.category_slugs.length || !p.category_slugs.every(slug => typeof slug === 'string' && slug.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug !== 'all'))) throw new Error('قائمة الأقسام غير صالحة.')
  if (!price(p.price) || (p.old_price !== null && (!price(p.old_price) || p.old_price < p.price))) throw new Error('راجعي الأسعار: السعر القديم لا يقل عن الحالي، وبحد أقصى ثلاث منازل عشرية.')
  if (p.is_new !== undefined && typeof p.is_new !== 'boolean') throw new Error('حالة جديد غير صالحة.')
  if (p.discount_enabled !== undefined) {
    if (typeof p.discount_enabled !== 'boolean' || !price(p.original_price)
      || (p.discount_enabled ? p.original_price! <= 0 || p.price >= p.original_price! || p.old_price !== p.original_price : p.price !== p.original_price || p.old_price !== null)) throw new Error('أدخل سعراً أصلياً موجباً وسعراً مخفّضاً أقل منه، بدقة ثلاث منازل عشرية.')
  }
  if ((p.description !== null && !string(p.description, 10000)) || (p.badge !== null && !string(p.badge, 150)) || !Array.isArray(p.benefits) || p.benefits.length > 50 || !p.benefits.every(b => string(b, 250, true))) throw new Error('الوصف أو الشارة أو الفوائد غير صالحة.')
  if (typeof p.is_active !== 'boolean' || typeof p.is_featured !== 'boolean' || !order(p.sort_order)) throw new Error('حالة المنتج أو ترتيبه غير صالح.')
  if (!Array.isArray(p.variants) || p.variants.length > 100 || !p.variants.every(v => v && string(v.id, 36) && UUID.test(v.id) && string(v.label, 250, true) && price(v.price) && typeof v.is_active === 'boolean' && order(v.sort_order))) throw new Error('راجعي أسماء الأنواع وأسعارها وترتيبها (100 نوع كحد أقصى).')
  if (new Set(p.variants.map(v => v.id)).size !== p.variants.length || new Set(p.variants.map(v => v.label.trim())).size !== p.variants.length) throw new Error('لا يمكن تكرار اسم النوع داخل المنتج.')
}
