import { authorizeAdminRequest, boundedFormData } from '@/lib/admin-request'
import { MAX_UPLOAD_BYTES, UUID } from '@/lib/products/editor'
import { BackgroundRemovalError, removeProductBackground } from '@/lib/products/remove-background'
import { sourceProductImage } from '@/lib/products/source-image'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const denied = await authorizeAdminRequest(request)
    if (denied) return denied
    const apiKey = process.env.REMOVE_BG_API_KEY ?? ''
    if (!apiKey.trim()) throw new BackgroundRemovalError('خدمة إزالة الخلفية غير مهيأة. أضيفي REMOVE_BG_API_KEY إلى .env.local ثم أعيدي تشغيل الخادم.', 503)
    const form = await boundedFormData(request)
    const id = String(form.get('productId') ?? '')
    const version = String(form.get('updatedAt') ?? '') || null
    if (!UUID.test(id) || (version && !Number.isFinite(Date.parse(version)))) throw new Error('بيانات المنتج غير صالحة.')
    const file = form.get('image')
    const hasFile = file instanceof File && file.size > 0
    if (hasFile && file.size > MAX_UPLOAD_BYTES) throw new Error('اختاري صورة بحجم أقصى 4 MB.')
    let originalUrl: string | null = null
    if (version) {
      const client = await createClient()
      const { data, error } = await client.from('products').select('image_url,original_image_url').eq('id', id).eq('updated_at', version).single()
      if (error || !data) throw new BackgroundRemovalError('تغير المنتج. حدّثي الصفحة قبل المعالجة.', 409)
      originalUrl = data.original_image_url ?? data.image_url
    }
    if (!hasFile && !originalUrl) throw new Error('اختاري صورة أولاً.')
    // Existing database source only: never accept an arbitrary image URL from the client.
    const input = hasFile ? Buffer.from(await file.arrayBuffer()) : await sourceProductImage(originalUrl!)
    const output = await removeProductBackground(input, apiKey, request.signal)
    return new Response(new Uint8Array(output), { headers: {
      'Content-Type': 'image/webp', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff',
    } })
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error && /[\u0600-\u06ff]/.test(error.message) ? error.message : 'تعذرت معالجة الصورة. أعيدي المحاولة أو استخدمي الصورة الأصلية.' }, {
      status: error instanceof BackgroundRemovalError ? error.status : 400, headers: { 'Cache-Control': 'no-store, private' },
    })
  }
}
