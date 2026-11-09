import sharp from 'sharp'

export const IMAGE_BUCKET = 'product-images'

export async function originalProductImage(input: Buffer) {
  const metadata = await sharp(input, { limitInputPixels: 50_000_000, failOn: 'warning', animated: false }).metadata()
  const formats: Record<string, [string, string]> = { jpeg: ['jpg', 'image/jpeg'], png: ['png', 'image/png'], webp: ['webp', 'image/webp'], gif: ['gif', 'image/gif'], avif: ['avif', 'image/avif'], heif: ['avif', 'image/avif'], tiff: ['tiff', 'image/tiff'] }
  const format = metadata.format && formats[metadata.format]
  if (!format || (metadata.format === 'heif' && metadata.compression !== 'av1')) throw new Error('صيغة الصورة غير مدعومة.')
  await sharp(input, { limitInputPixels: 50_000_000, failOn: 'warning', animated: false }).stats()
  return { bytes: input, extension: format[0], contentType: format[1] }
}

/** Bound new display renditions; the separately stored original remains untouched. */
export async function approvedProductImage(input: Buffer, requireTransparency: boolean) {
  await originalProductImage(input)
  const result = await sharp(input, { limitInputPixels: 50_000_000, failOn: 'warning', animated: false })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 100, effort: 4 }).toBuffer()
  if (requireTransparency) {
    const alpha = (await sharp(result).stats()).channels[3]
    if (!alpha || alpha.min === 255 || alpha.max === 0) throw new Error('الصورة المعالجة لا تحتوي منتجاً بخلفية شفافة صالحة.')
  }
  return result
}

export async function convertProductImage(input: Buffer) {
  const pipeline = sharp(input, { limitInputPixels: 50_000_000, failOn: 'warning', animated: false })
  const metadata = await pipeline.metadata()
  if (!metadata.format || !['jpeg', 'png', 'webp', 'gif', 'avif', 'heif', 'tiff'].includes(metadata.format)) {
    throw new Error('صيغة الصورة غير مدعومة. اختاري JPG أو PNG أو WebP أو GIF أو AVIF.')
  }
  return pipeline.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84, effort: 4 }).toBuffer()
}

/** Only delete objects created for this product in this project's managed bucket. */
export function managedImagePath(url: string | null, productId: string, supabaseUrl: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const base = new URL(supabaseUrl)
    const prefix = `/storage/v1/object/public/${IMAGE_BUCKET}/`
    if (parsed.origin !== base.origin || !parsed.pathname.startsWith(prefix)) return null
    const path = decodeURIComponent(parsed.pathname.slice(prefix.length))
    return new RegExp(`^products/${productId}/[a-f0-9-]+\\.(webp|png|jpg|gif|avif|tiff)$`, 'i').test(path) ? path : null
  } catch { return null }
}
