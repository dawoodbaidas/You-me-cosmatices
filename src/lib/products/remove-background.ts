import { originalProductImage, approvedProductImage } from './images'
import { MAX_UPLOAD_BYTES } from './editor'
import sharp from 'sharp'

export class BackgroundRemovalError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

/** Server-side only. No SDK, automatic retries, model fallback, or Storage writes. */
export async function removeProductBackground(input: Buffer, apiKey: string, clientSignal: AbortSignal) {
  if (!apiKey.trim()) throw new BackgroundRemovalError('خدمة إزالة الخلفية غير مهيأة. أضيفي REMOVE_BG_API_KEY إلى .env.local ثم أعيدي تشغيل الخادم.', 503)
  const original = await originalProductImage(input)
  // remove.bg accepts JPG/PNG/WebP; normalize the editor's other supported formats.
  const supported = ['jpg', 'png', 'webp'].includes(original.extension)
  const bytes = supported ? original.bytes : await sharp(original.bytes).rotate().png().toBuffer()
  if (bytes.length > 22 * 1024 * 1024) throw new BackgroundRemovalError('الصورة بعد التحويل كبيرة جداً. اختاري JPG أو PNG أصغر.', 400)
  const form = new FormData()
  form.set('image_file', new Blob([new Uint8Array(bytes)], { type: supported ? original.contentType : 'image/png' }), `product.${supported ? original.extension : 'png'}`)
  form.set('size', 'preview')
  form.set('format', 'png')
  form.set('channels', 'rgba')
  const signal = AbortSignal.any([clientSignal, AbortSignal.timeout(45_000)])
  try {
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST', headers: { 'X-Api-Key': apiKey }, body: form, signal, redirect: 'error', cache: 'no-store',
    })
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status === 401 || response.status === 403) throw new BackgroundRemovalError('مفتاح remove.bg غير صالح أو غير مخوّل. تحققي من REMOVE_BG_API_KEY على الخادم.', 503)
      if (response.status === 402) throw new BackgroundRemovalError('نفدت حصة remove.bg المتاحة. استخدمي الصورة الأصلية أو راجعي حصة الحساب.', 429)
      if (response.status === 429) throw new BackgroundRemovalError('تم تجاوز حد طلبات remove.bg أو الحصة المتاحة. انتظري قليلاً أو استخدمي الصورة الأصلية.', 429)
      if (response.status === 400 || response.status === 422) throw new BackgroundRemovalError('تعذر فصل المنتج في هذه الصورة. جرّبي صورة أوضح أو استخدمي الصورة الأصلية.', 400)
      throw new BackgroundRemovalError('خدمة remove.bg غير متاحة حالياً. أعيدي المحاولة لاحقاً أو استخدمي الصورة الأصلية.', 502)
    }
    if (!response.body) throw new BackgroundRemovalError('لم تُرجع الخدمة صورة صالحة.', 502)
    const reader = response.body.getReader(), chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      size += value.length
      if (size > 12 * 1024 * 1024) { await reader.cancel(); throw new BackgroundRemovalError('حجم الصورة المعالجة غير صالح.', 502) }
      chunks.push(value)
    }
    let output: Buffer
    try { output = await approvedProductImage(Buffer.concat(chunks), true) }
    catch { throw new BackgroundRemovalError('لم تنتج الخدمة صورة شفافة صالحة. استخدمي الصورة الأصلية أو أعيدي المحاولة بصورة أخرى.', 502) }
    if (output.length > MAX_UPLOAD_BYTES) throw new BackgroundRemovalError('الصورة المعالجة أكبر من 4 MB. استخدمي صورة أصغر.', 400)
    return output
  } catch (error) {
    if (error instanceof BackgroundRemovalError) throw error
    if (signal.aborted || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))) throw new BackgroundRemovalError('انتهت مهلة إزالة الخلفية أو أُلغي الطلب. أعيدي المحاولة أو استخدمي الصورة الأصلية.', 504)
    throw new BackgroundRemovalError('تعذر الاتصال بـ remove.bg. أعيدي المحاولة أو استخدمي الصورة الأصلية.', 502)
  }
}
