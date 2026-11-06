import { getViewer } from '@/lib/auth'
import { MAX_UPLOAD_BYTES } from '@/lib/products/editor'

export async function authorizeAdminRequest(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!origin || new URL(origin).host !== host) return Response.json({ ok: false, message: 'الطلب غير مسموح.' }, { status: 403 })
  const { user, admin } = await getViewer()
  if (!user || !admin) return Response.json({ ok: false, message: 'يرجى تسجيل الدخول بحساب مسؤول.' }, { status: 403 })
  return null
}

export async function boundedFormData(request: Request, maxImageBytes = MAX_UPLOAD_BYTES) {
  const limit = maxImageBytes + 128 * 1024
  if (Number(request.headers.get('content-length')) > limit) throw new Error('حجم الصورة الأقصى 4 MB.')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('الطلب فارغ.')
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > limit) { await reader.cancel(); throw new Error('حجم الصورة الأقصى 4 MB.') }
    chunks.push(value)
  }
  return new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData()
}
