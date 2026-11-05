import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { MAX_UPLOAD_BYTES } from './editor'

// Existing database images only: never fetch an arbitrary client-supplied URL.
export async function sourceProductImage(url: string) {
  if (/^\/products\/[a-zA-Z0-9_./-]+$/.test(url) && !url.includes('..')) {
    const bytes = await readFile(resolve(process.cwd(), 'public', url.slice(1)))
    if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('الصورة الأصلية أكبر من 4 MB.')
    return bytes
  }
  const source = new URL(url)
  const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
  if (source.origin !== base.origin || !source.pathname.startsWith('/storage/v1/object/public/')) throw new Error('ارفع الصورة الأصلية من جهازك لمعالجتها.')
  const response = await fetch(source, { redirect: 'error', signal: AbortSignal.timeout(15_000) })
  if (!response.ok || !response.body) throw new Error('تعذر تحميل الصورة الأصلية.')
  const chunks: Uint8Array[] = []; let size = 0
  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    size += value.length
    if (size > MAX_UPLOAD_BYTES) { await reader.cancel(); throw new Error('الصورة الأصلية أكبر من 4 MB.') }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}
