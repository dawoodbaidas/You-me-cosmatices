import sharp from 'sharp'

export const IMAGE_BUCKET = 'product-images'

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
    return new RegExp(`^products/${productId}/[a-f0-9-]+\\.webp$`, 'i').test(path) ? path : null
  } catch { return null }
}
