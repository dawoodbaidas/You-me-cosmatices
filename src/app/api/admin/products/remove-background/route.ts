import { authorizeAdminRequest, boundedFormData } from '@/lib/admin-request'
import { MAX_UPLOAD_BYTES, UUID } from '@/lib/products/editor'
import { removeProductBackground, originalProductImage, IMAGE_BUCKET } from '@/lib/products/images'
import { sourceProductImage } from '@/lib/products/source-image'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'node:crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const uploaded: string[] = []
  let uncertain = false
  try {
    const denied = await authorizeAdminRequest(request)
    if (denied) return denied
    const form = await boundedFormData(request)
    const file = form.get('image')
    const id = String(form.get('productId') ?? '')
    const version = String(form.get('updatedAt') ?? '') || null
    if (!UUID.test(id) || (version && !Number.isFinite(Date.parse(version)))) throw new Error('بيانات المنتج غير صالحة.')
    const client = await createClient()
    let originalUrl: string | null = null
    if (version) {
      const { data, error } = await client.from('products').select('image_url,original_image_url').eq('id', id).eq('updated_at', version).single()
      if (error || !data) throw new Error('تغير المنتج. حدّث الصفحة قبل المعالجة.')
      originalUrl = data.original_image_url ?? data.image_url
    }
    const hasFile = file instanceof File && file.size > 0
    if (hasFile && file.size > MAX_UPLOAD_BYTES) throw new Error('اختر صورة بحجم أقصى 4 MB.')
    if (!hasFile && !originalUrl) throw new Error('اختر صورة أولاً.')
    const input = hasFile ? Buffer.from(await file.arrayBuffer()) : await sourceProductImage(originalUrl!)
    const output = await removeProductBackground(input, process.env.PHOTOROOM_API_KEY ?? '')
    if (output.length > MAX_UPLOAD_BYTES) throw new Error('الصورة المعالجة أكبر من 4 MB.')
    const upload = async (bytes: Buffer, extension: string, contentType: string) => {
      const path = `products/${id}/${randomUUID()}.${extension}`
      const { error } = await client.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType, cacheControl: '31536000' })
      if (error) throw new Error('تعذر رفع الصورة المعالجة.')
      uploaded.push(path)
      return client.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
    }
    if (hasFile || originalUrl?.startsWith('/')) {
      const original = await originalProductImage(input)
      originalUrl = await upload(original.bytes, original.extension, original.contentType)
    }
    const processedUrl = await upload(output, 'webp', 'image/webp')
    const previewId = randomUUID()
    uncertain = true
    const { error } = await client.from('product_image_previews').insert({ id: previewId, product_id: id, expected_updated_at: version, original_url: originalUrl, processed_url: processedUrl })
    if (error) { uncertain = !['23503','23514','42501','PGRST205'].includes(error.code); throw new Error('تعذر حفظ المعاينة. تحقق من الترحيل 006.') }
    return Response.json({ previewId, originalUrl, processedUrl }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (uploaded.length && !uncertain) {
      try { const client = await createClient(); await client.storage.from(IMAGE_BUCKET).remove(uploaded) } catch {}
    }
    return Response.json({ ok: false, message: error instanceof Error && /[\u0600-\u06ff]/.test(error.message) ? error.message : 'تعذّرت معالجة الصورة. أعد المحاولة أو استخدم الصورة الأصلية.' }, { status: 400 })
  }
}
