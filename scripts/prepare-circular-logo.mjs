import sharp from 'sharp'

// Keep the central artwork untouched and feather only the outer background.
const input = 'public/brand/logo.png'
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const edge = 45
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const distance = Math.min(x, y, info.width - 1 - x, info.height - 1 - y)
  data[(y * info.width + x) * 4 + 3] = Math.round(255 * Math.min(1, distance / edge))
}
const foreground = await sharp(data, { raw: info }).png().toBuffer()
const background = await sharp(input).resize(info.height, info.height, { fit: 'cover' }).blur(60).png().toBuffer()
const mask = Buffer.from(`<svg width="${info.height}" height="${info.height}"><circle cx="${info.height / 2}" cy="${info.height / 2}" r="${info.height / 2}" fill="white"/></svg>`)
await sharp(background).composite([{ input: foreground, left: Math.round((info.height - info.width) / 2), top: 0 }, { input: mask, blend: 'dest-in' }]).png().toFile('public/brand/logo-circular.png')
