// Display metadata only. The browser owns image bytes and decoded-image caching.
export const PRODUCT_IMAGE_QUALITY = 75
export const PRODUCT_IMAGE_SIZES = {
  cart: '(max-width: 767px) 88px, 148px',
  listing: '(max-width: 599px) calc((100vw - 30px) / 2), (max-width: 767px) calc((100vw - 40px) / 3), (max-width: 1199px) calc((100vw - 52px) / 2), (max-width: 1439px) calc((100vw - 76px) / 3), 455px',
  detail: '(max-width: 767px) 90vw, 440px',
  hero: '(max-width:767px) 32vw, (max-width:1200px) 36vw, 480px',
  scene: '(max-width:767px) 65vw, (max-width:1200px) 42vw, 520px',
} as const

export type LoadedProductImage = { currentSrc: string; width: number; height: number }
export type ProductImageFrame = { width: number; height: number; subject: { x: number; y: number; width: number; height: number } }
type MediaRecord = { loaded?: LoadedProductImage; frame?: ProductImageFrame }
const records = new Map<string, MediaRecord>()
function touch(source: string, record: MediaRecord) {
  records.delete(source)
  records.set(source, record)
  if (records.size > 100) records.delete(records.keys().next().value!)
  return record
}
export function loadedProductImage(source: string) {
  const record = records.get(source)
  return record && touch(source, record).loaded
}
export function rememberProductImage(source: string, image: LoadedProductImage) {
  if (!image.currentSrc || image.width <= 0 || image.height <= 0) return
  const record = records.get(source) ?? {}
  // A cart thumbnail must not replace the higher-resolution detail/scene record.
  if (!record.loaded || image.width >= record.loaded.width) record.loaded = image
  touch(source, record)
}
export function productImageFrame(source: string) { return records.get(source)?.frame }
export function rememberProductImageFrame(source: string, frame: ProductImageFrame) {
  touch(source, { ...records.get(source), frame })
}
