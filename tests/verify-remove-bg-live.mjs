// Explicit opt-in live smoke test: one preview request, no Supabase writes.
import { createRequire } from 'node:module'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { modules } from './helpers/load-app.mjs'

const require = createRequire(import.meta.url)
require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} })
const key = process.env.REMOVE_BG_API_KEY ?? ''
if (!key.trim()) {
  console.error('REMOVE_BG_API_KEY is missing. Set it in .env.local and restart Next.js.')
  process.exitCode = 1
} else {
  try {
    const { removeProductBackground } = modules()('@/lib/products/remove-background')
    const input = await readFile(resolve('public/products/hyaluronic-cream.png'))
    const bytes = await removeProductBackground(input, key, new AbortController().signal)
    const metadata = await sharp(bytes).metadata(), stats = await sharp(bytes).stats()
    const directory = resolve('artifacts/product-image-editor')
    await mkdir(directory, { recursive: true })
    await writeFile(resolve(directory, 'remove-bg-preview.webp'), bytes)
    console.log(JSON.stringify({ provider: 'remove.bg', size: 'preview', format: metadata.format, width: metadata.width, height: metadata.height, alphaMin: stats.channels[3]?.min, alphaMax: stats.channels[3]?.max, storageWrites: 0 }))
  } catch (error) {
    // The server helper exposes only sanitized errors, never headers/provider response text.
    console.error(error.message)
    process.exitCode = 1
  }
}
