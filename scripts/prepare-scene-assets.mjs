// Read-only image analysis. Raster originals and the API catalogue stay unchanged.
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { paletteFromPixels } from '../src/lib/scene-palette.ts'

const slugs = ['body-mist', 'aloe-foam', 'foundation', 'mascara', 'musk-tahara-oil']
const result = {}
for (const slug of slugs) {
  const src = `/products/cutouts/${slug}.png`
  const { data, info } = await sharp(`public${src}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width, top = info.height, right = 0, bottom = 0, transparent = 0
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3]
    if (alpha === 0) transparent++
    if (alpha < 128) continue
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
  }
  if (!transparent || right <= left || bottom <= top) throw Error(`Missing cutout alpha: ${slug}`)
  const pixels = await sharp(`public${src}`).resize(64, 64, { fit: 'inside' }).ensureAlpha().raw().toBuffer()
  result[slug] = { src, source: `/products/${slug}.webp`, width: info.width, height: info.height,
    bounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }, ...paletteFromPixels(pixels) }
}
await fs.writeFile('src/data/scene-assets.json', JSON.stringify(result, null, 2) + '\n')
console.log(`Analyzed ${slugs.length} transparent cutouts; saved bounds and contrast-safe image palettes.`)
