import { randomUUID } from 'node:crypto'
import { invalidateStoreCatalogue } from '@/lib/store-cache'
import { createClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/auth'
import { MAX_UPLOAD_BYTES, UUID, validateProduct } from '@/lib/products/editor'
import { convertProductImage, IMAGE_BUCKET, managedImagePath } from '@/lib/products/images'

export const runtime = 'nodejs'

const reply = (ok: boolean, message: string, status = 200) => Response.json({ ok, message }, { status })

async function authorize(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!origin || new URL(origin).host !== host) return reply(false, 'الطلب غير مسموح.', 403)
  const { user, admin } = await getViewer()
  if (!user || !admin) return reply(false, 'يرجى تسجيل الدخول بحساب مسؤول.', 403)
  return null
}

async function removeOldImage(url: string | null, id: string) {
  const path = managedImagePath(url, id, process.env.NEXT_PUBLIC_SUPABASE_URL!)
  if (!path) return true
  try {
    const supabase = await createClient()
    // Preserve shared references, including deactivated products (admin RLS).
    const { count, error } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('image_url', url!)
    if (error) return false
    if (count) return true
    const result = await supabase.storage.from(IMAGE_BUCKET).remove([path])
    return !result.error
  } catch { return false }
}

export async function POST(request: Request) {
  try {
    const denied = await authorize(request)
    if (denied) return denied
    // Bound actual streamed bytes too; Content-Length alone is not trustworthy.
    const limit = MAX_UPLOAD_BYTES + 128 * 1024
    if (Number(request.headers.get('content-length')) > limit) return reply(false, 'حجم الصورة الأقصى 4 MB.', 413)
    const reader = request.body?.getReader()
    if (!reader) return reply(false, 'الطلب فارغ.', 400)
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) { await reader.cancel(); return reply(false, 'حجم الصورة الأقصى 4 MB.', 413) }
      chunks.push(value)
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData()
    const raw = form.get('product')
    if (typeof raw !== 'string' || raw.length > 100_000) return reply(false, 'بيانات المنتج غير صالحة.', 400)
    const draft: unknown = JSON.parse(raw)
    validateProduct(draft)
    const { variants, updatedAt, ...product } = draft
    const supabase = await createClient()
    const file = form.get('image')
    let imageUrl: string | undefined
    if (file instanceof File && file.size) {
      if (file.size > MAX_UPLOAD_BYTES) return reply(false, 'حجم الصورة الأقصى 4 MB.', 413)
      let converted: Buffer
      try { converted = await convertProductImage(Buffer.from(await file.arrayBuffer())) }
      catch { return reply(false, 'تعذر قراءة الصورة. اختاري صورة سليمة JPG أو PNG أو WebP أو GIF أو AVIF وبأبعاد أقل من 50 مليون بكسل.', 400) }
      if (converted.length > MAX_UPLOAD_BYTES) return reply(false, 'الصورة كبيرة جداً بعد التحويل. اختاري صورة أصغر.', 400)
      const path = `products/${product.id}/${randomUUID()}.webp`
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, converted, { contentType: 'image/webp', cacheControl: '31536000', upsert: false })
      if (error) return reply(false, 'تعذر رفع الصورة. تحققي من إعداد مخزن الصور والصلاحيات ثم حاولي مجدداً.', 400)
      imageUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
    }
    const { data, error } = await supabase.rpc('admin_save_product', {
      p_product: { ...product, ...(imageUrl ? { image_url: imageUrl } : {}) },
      p_variants: variants,
      p_expected_updated_at: updatedAt,
    })
    if (error) {
      // On uncertain network outcomes, retain the new object: the transaction may
      // already have committed. Never risk deleting a product's saved image.
      if (imageUrl && ['23505', '23514', '22023', '40001', '42501', 'PGRST202'].includes(error.code)) await removeOldImage(imageUrl, product.id)
      return reply(false, error.code === '40001' ? 'تم تعديل المنتج في جلسة أخرى. حدّثي الصفحة قبل الحفظ.' : error.code === '23505' ? 'الرابط المختصر أو اسم النوع مستخدم بالفعل. راجعي القائمة قبل إعادة المحاولة.' : 'تعذر حفظ المنتج. تحققي من الاتصال وتطبيق الترحيل 002 ثم حدّثي القائمة قبل إعادة المحاولة.', 409)
    }
    const cleaned = !imageUrl || await removeOldImage(data.previous_image, product.id)
    invalidateStoreCatalogue()
    return reply(true, cleaned ? 'تم حفظ المنتج والصورة والأنواع بنجاح.' : 'تم الحفظ. تعذر تنظيف الصورة القديمة؛ يمكن حذفها لاحقاً من المخزن.')
  } catch (error) {
    return reply(false, error instanceof Error && /[\u0600-\u06ff]/.test(error.message) ? error.message : 'تعذر إتمام الطلب. تحققي من الاتصال ثم حدّثي القائمة قبل إعادة المحاولة.', 400)
  }
}

export async function DELETE(request: Request) {
  try {
    const denied = await authorize(request)
    if (denied) return denied
    const url = new URL(request.url)
    const id = url.searchParams.get('id') ?? ''
    const version = url.searchParams.get('version') ?? ''
    if (!UUID.test(id) || !Number.isFinite(Date.parse(version))) return reply(false, 'بيانات المنتج غير صالحة.', 400)
    const supabase = await createClient()
    const { data, error } = await supabase.from('products').delete().eq('id', id).eq('updated_at', version).select('image_url').single()
    if (error || !data) return reply(false, 'تعذر الحذف أو تم تعديل المنتج. حدّثي الصفحة وحاولي مجدداً.', 409)
    const cleaned = await removeOldImage(data.image_url, id)
    invalidateStoreCatalogue()
    return reply(true, cleaned ? 'تم حذف المنتج وأنواعه.' : 'تم حذف المنتج. تعذر تنظيف الصورة؛ يمكن حذفها لاحقاً من المخزن.')
  } catch { return reply(false, 'تعذر الحذف. تحققي من الاتصال وحدّثي القائمة.', 500) }
}
