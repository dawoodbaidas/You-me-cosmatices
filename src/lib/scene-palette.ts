export type RGB = [number, number, number]
export type ScenePalette = { bgA: RGB; bgB: RGB }
export const INK: RGB = [43, 38, 32]
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
export const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB
const luminance = (rgb: RGB) => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
export const contrast = (rgb: RGB) => (luminance(rgb) + .05) / (luminance(INK) + .05)

export function readable(color: RGB): RGB {
  for (let i = 0; i <= 100; i++) {
    const next = mix(color, [255, 255, 255], i / 100)
    if (contrast(next) >= 4.55) return next
  }
  return [255, 255, 255]
}

export function paletteFromPixels(pixels: ArrayLike<number>): ScenePalette {
  const buckets = new Map<string, { sum: RGB; count: number }>()
  let total: RGB = [0, 0, 0], count = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue
    const rgb: RGB = [pixels[i], pixels[i + 1], pixels[i + 2]]
    total = total.map((v, j) => v + rgb[j]) as RGB; count++
    const brightness = (rgb[0] + rgb[1] + rgb[2]) / 3
    if (brightness > 245 || brightness < 25) continue
    const key = rgb.map(v => Math.floor(v / 32)).join(',')
    const bucket = buckets.get(key) ?? { sum: [0, 0, 0] as RGB, count: 0 }
    bucket.sum = bucket.sum.map((v, j) => v + rgb[j]) as RGB; bucket.count++
    buckets.set(key, bucket)
  }
  const dominant = [...buckets.values()].sort((a, b) => b.count - a.count)[0]
  const color = (dominant ? dominant.sum.map(v => Math.round(v / dominant.count)) : total.map(v => Math.round(v / Math.max(1, count)))) as RGB
  const gray = Math.round(color.reduce((a, b) => a + b) / 3)
  return { bgA: readable(mix(color, [255, 255, 255], .55)), bgB: readable(mix(color, [gray, gray, gray], .15)) }
}

export function interpolatePalette(a: ScenePalette, b: ScenePalette, progress: number): ScenePalette {
  return { bgA: readable(mix(a.bgA, b.bgA, progress)), bgB: readable(mix(a.bgB, b.bgB, progress)) }
}

export const showcasePosition = (distance: number, width: number) => -Math.sign(distance) * (Math.min(Math.abs(distance), 1) * .33 + Math.max(0, Math.abs(distance) - 1)) * Math.min(width, 1200)
