'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { invalidateStoreCatalogue } from '@/lib/store-cache'
import { UUID } from '@/lib/products/editor'
import { mapProduct } from '@/lib/products/map'
import { validateCategory, type CategoryDraft } from '@/lib/category-editor'

export interface ActionResult {
  ok: boolean
  message: string
}

const SETTING_KEYS = [
  'whatsapp_number',
  'whatsapp_message',
  'email',
  'instagram_url',
  'facebook_url',
  'currency',
  'store_tagline',
  'store_announcement',
  'store_free_shipping_threshold',
  'store_shipping_fee',
] as const

export type SettingsPayload = Record<(typeof SETTING_KEYS)[number], string>

/* ------------------------------------------------------------------- auth */

export async function signIn(email: string, password: string): Promise<ActionResult> {
  const cleanEmail = email.trim()
  if (!cleanEmail || !password) return { ok: false, message: 'أدخلي البريد الإلكتروني وكلمة السر.' }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
  if (error) return { ok: false, message: 'بيانات الدخول غير صحيحة.' }

  // Authentication alone is not authorisation.
  if (!(await isAdmin())) {
    await supabase.auth.signOut()
    return { ok: false, message: 'هذا الحساب ليس حساب مسؤول.' }
  }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/admin/login')
}

/* --------------------------------------------------------------- catalogue */

export interface ProductPricePayload {
  productId: string
  updatedAt: string
  price: number
  oldPrice: number | null
  /** Variant id → new price. Only the ones present are written. */
  variantPrices: Record<string, number>
}

const MAX_PRICE = 100_000

export async function saveProductPrices(payload: ProductPricePayload): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, message: 'غير مصرّح — سجّلي الدخول كمسؤول.' }

  const { productId, updatedAt, price, oldPrice, variantPrices } = payload
  if (!productId) return { ok: false, message: 'معرّف المنتج مفقود.' }

  if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
    return { ok: false, message: 'السعر غير صالح.' }
  }
  if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= price || oldPrice > MAX_PRICE)) {
    return { ok: false, message: 'السعر القديم يجب أن يكون أكبر من السعر الحالي أو فارغاً.' }
  }

  if ([price, ...(oldPrice === null ? [] : [oldPrice]), ...Object.values(variantPrices)].some(value => Math.abs(value * 1000 - Math.round(value * 1000)) > .00001)) return { ok: false, message: 'الأسعار بدقة ثلاث منازل عشرية كحد أقصى.' }
  const entries = Object.entries(variantPrices)
  for (const [, variantPrice] of entries) {
    if (!Number.isFinite(variantPrice) || variantPrice < 0 || variantPrice > MAX_PRICE) {
      return { ok: false, message: 'أحد أسعار الأنواع غير صالح.' }
    }
  }

  const supabase = await createClient()

  const { error: productError } = await supabase.rpc('admin_save_product_prices', {
    p_id: productId,
    p_price: price,
    p_old_price: oldPrice,
    p_variants: variantPrices,
    p_expected_updated_at: updatedAt,
  })

  if (productError) return { ok: false, message: `تعذّر حفظ سعر المنتج: ${productError.message}` }

  invalidateStoreCatalogue()

  const count = entries.length
  return {
    ok: true,
    message: count > 0 ? `تم حفظ السعر و${count} من الأنواع ✅` : 'تم حفظ السعر ✅',
  }
}

export async function setProductFlags(
  productId: string,
  patch: { is_active?: boolean; is_featured?: boolean },
): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, message: 'غير مصرّح.' }
  if (!productId) return { ok: false, message: 'معرّف المنتج مفقود.' }

  const supabase = await createClient()
  const flags: { is_active?: boolean; is_featured?: boolean } = {}
  if (typeof patch.is_active === 'boolean') flags.is_active = patch.is_active
  if (typeof patch.is_featured === 'boolean') flags.is_featured = patch.is_featured
  if (!Object.keys(flags).length) return { ok: false, message: 'اختاري الحالة المطلوبة.' }
  const { error } = await supabase.from('products').update(flags).eq('id', productId).select('id').single()
  if (error) return { ok: false, message: error.message }

  invalidateStoreCatalogue()
  return { ok: true, message: 'تم التحديث ✅' }
}

export async function saveSettings(payload: SettingsPayload): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, message: 'غير مصرّح — سجّلي الدخول كمسؤول.' }

  const rows = SETTING_KEYS.map((key) => ({ key, value: String(payload[key] ?? '').trim() }))
  for (const key of ['store_free_shipping_threshold', 'store_shipping_fee']) {
    const value = rows.find(row => row.key === key)?.value
    if (!value || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100_000) return { ok: false, message: 'رسوم التوصيل وحدّه المجاني يجب أن يكونا رقمين غير سالبين.' }
  }

  const whatsapp = rows.find((row) => row.key === 'whatsapp_number')?.value ?? ''
  if (whatsapp && !/^\d{6,15}$/.test(whatsapp.replace(/\D/g, '').slice(0, 15))) {
    return { ok: false, message: 'رقم واتساب غير صالح — أرقام فقط مع رمز الدولة.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
  if (error) return { ok: false, message: `تعذّر حفظ الإعدادات: ${error.message}` }

  invalidateStoreCatalogue()
  return { ok: true, message: 'تم حفظ الإعدادات ✅' }
}

export async function saveStoreCategory(payload: CategoryDraft): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, message: 'غير مصرّح.' }
  try { validateCategory(payload) } catch (error) { return { ok: false, message: (error as Error).message } }
  const client = await createClient()
  const { updated_at, ...row } = payload
  const { error } = await client.rpc('admin_save_category', { p_category: row, p_expected_updated_at: updated_at })
  if (error) return { ok: false, message: 'تعذّر حفظ القسم. تحقق من الرابط والقسم الرئيسي، وحدّث الصفحة إذا عدّلته جلسة أخرى.' }
  invalidateStoreCatalogue()
  return { ok: true, message: 'تم حفظ القسم.' }
}

export async function deleteStoreCategory(slug: string, updatedAt: string, target: string | null = null): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, message: 'غير مصرح.' }
  if (!slug || !Number.isFinite(Date.parse(updatedAt)) || target === slug || (target !== null && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target))) return { ok: false, message: 'اختيار القسم غير صالح.' }
  const client = await createClient()
  const { error } = await client.rpc('admin_delete_category', { p_slug: slug, p_expected_updated_at: updatedAt, p_target: target })
  if (error) return { ok: false, message: 'تعذّر حذف القسم. حدّث الصفحة وتحقق من القسم الهدف.' }
  invalidateStoreCatalogue()
  return { ok: true, message: 'تم حذف القسم وحفظ المنتجات وتحديث تصنيفها.' }
}

export async function moveProducts(ids: string[], target: string | null): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, message: 'غير مصرح.' }
  if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || ids.some(id => !UUID.test(id)) || new Set(ids).size !== ids.length || (target !== null && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target))) return { ok: false, message: 'اختيار المنتجات أو القسم غير صالح.' }
  const client = await createClient()
  const { error } = await client.rpc('admin_move_products', { p_ids: ids, p_target: target })
  if (error) return { ok: false, message: 'تعذّر نقل المنتجات. حدّث القائمة وتحقق من القسم الهدف.' }
  invalidateStoreCatalogue()
  return { ok: true, message: 'تم نقل المنتجات المحددة.' }
}

export async function searchAdminProducts(query: string) {
  if (!(await isAdmin())) throw new Error('غير مصرح.')
  const needle = String(query).slice(0, 150).replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim()
  const client = await createClient()
  let request = client.from('products').select('*,product_categories(category_slug),product_variants(*)').order('sort_order').order('id').limit(25)
  if (needle) request = request.or(`name_ar.ilike.%${needle}%,name_en.ilike.%${needle}%,slug.ilike.%${needle}%`)
  const { data, error } = await request
  if (error) throw new Error('تعذّر البحث عن المنتجات.')
  return (data ?? []).map(row => mapProduct(row, true))
}

export async function saveHomeSection(section: string, ids: string[], updatedAt: string): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, message: 'غير مصرح.' }
  if (!['hero', 'bestsellers'].includes(section) || !Array.isArray(ids) || ids.length > (section === 'hero' ? 5 : 100) || ids.some(id => !UUID.test(id)) || new Set(ids).size !== ids.length || !Number.isFinite(Date.parse(updatedAt))) return { ok: false, message: 'قائمة المنتجات غير صالحة (الحد الأقصى للهيرو خمسة منتجات).' }
  const client = await createClient()
  const { error } = await client.rpc('admin_save_home_section', { p_section: section, p_ids: ids, p_expected_updated_at: updatedAt })
  if (error) return { ok: false, message: 'تعذّر الحفظ أو تغيّرت القائمة في جلسة أخرى. حدّث الصفحة ثم أعد المحاولة.' }
  invalidateStoreCatalogue()
  return { ok: true, message: 'تم حفظ الاختيارات والترتيب.' }
}
