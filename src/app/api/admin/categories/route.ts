import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { authorizeAdminRequest, boundedFormData } from '@/lib/admin-request'
import { validateCategory } from '@/lib/category-editor'
import { createClient } from '@/lib/supabase/server'
import { invalidateStoreCatalogue } from '@/lib/store-cache'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const denied = await authorizeAdminRequest(request)
    if (denied) return denied
    const form = await boundedFormData(request)
    const draft: unknown = JSON.parse(String(form.get('category')))
    validateCategory(draft)
    const client = await createClient()
    let uploaded: string | null = null
    const file = form.get('image')
    if (file instanceof File && file.size) {
      const pipeline = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000, failOn: 'warning' })
      const metadata = await pipeline.metadata()
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw new Error('اختر JPG أو PNG أو WebP.')
      const image = await pipeline.rotate().resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer()
      uploaded = `categories/${randomUUID()}/${randomUUID()}.webp`
      const { error } = await client.storage.from('category-images').upload(uploaded, image, { contentType: 'image/webp', cacheControl: '31536000' })
      if (error) throw new Error('تعذر رفع صورة القسم. تحقق من إعداد المخزن.')
      draft.image_path = uploaded
    }
    const { updated_at, ...row } = draft
    const { error } = await client.rpc('admin_save_category', { p_category: row, p_expected_updated_at: updated_at })
    if (error) {
      if (uploaded && ['23505','23514','23503','22023','40001','42501','P0001','PGRST202'].includes(error.code)) await client.storage.from('category-images').remove([uploaded])
      throw new Error('تعذر حفظ القسم. تحقق من القسم الأب وحدّث الصفحة إذا تغيرت البيانات.')
    }
    invalidateStoreCatalogue()
    return Response.json({ ok: true, message: 'تم حفظ القسم والصورة والرابط التلقائي.' })
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error && /[\u0600-\u06ff]/.test(error.message) ? error.message : 'تعذر حفظ القسم.' }, { status: 400 })
  }
}
