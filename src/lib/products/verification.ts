import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyProductImage } from './images'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Only server-verified bytes can create a receipt; never accept browser metadata. */
export async function recordImageVerification(productId: string, source: string, bytes: Buffer) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('خدمة التحقق من الصور غير مهيأة على الخادم.')
  const verification = await verifyProductImage(bytes)
  const client = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } })
  const { error } = await client.from('product_image_verifications').upsert({ product_id: productId, source, verification }, { onConflict: 'product_id,source' })
  if (error) {
    console.error('Product image verification failed', { code: error.code, message: error.message })
    throw new Error('تعذّر تسجيل التحقق من الصورة. تحققي من تطبيق الترحيل 008 وإعداد مفتاح الخادم.')
  }
  return verification
}

/** Selection is read-only; the SQL transaction rechecks under product row locks. */
export async function verifySceneSelection(client: SupabaseClient, ids: string[]) {
  if (!ids.length) return
  const { data, error } = await client.from('products').select('id,name_ar,image_url').in('id', ids)
  if (error || !data || data.length !== ids.length) throw new Error('????? ????? ??? ????????. ????? ??????? ?????? ????????.')
  for (const product of data) {
    if (!product.image_url?.trim()) throw new Error('?????? ?' + product.name_ar + '? ????? ???? ??? ?????? ???????.')
  }
}
