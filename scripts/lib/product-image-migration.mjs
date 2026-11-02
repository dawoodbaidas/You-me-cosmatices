import { createHash } from 'node:crypto'
import { readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { convertProductImage, IMAGE_BUCKET } from '../../src/lib/products/images.ts'

export { IMAGE_BUCKET }
export const MAX_SOURCE_BYTES = 32 * 1024 * 1024
export const MAX_STORED_BYTES = 4 * 1024 * 1024
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

export function storagePath(productId, bytes) {
  if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new Error('Invalid product UUID')
  // Content-addressed, UUID-shaped name: compatible with existing Storage RLS
  // and admin managedImagePath cleanup. Never overwrite an existing object.
  const hex = sha256(bytes).slice(0, 32)
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  return `products/${productId}/${uuid}.webp`
}

export async function inspectImage(bytes) {
  if (!bytes.length || bytes.length > MAX_SOURCE_BYTES) throw new Error('Source image empty or exceeds 32 MiB')
  const meta = await sharp(bytes, { limitInputPixels: 50_000_000, failOn: 'warning' }).metadata()
  // Decode the pixels too: a valid header alone does not prove a complete file.
  await sharp(bytes, { limitInputPixels: 50_000_000, failOn: 'warning' }).stats()
  const optimized = meta.format === 'webp' && meta.width <= 1600 && meta.height <= 1600 &&
    (meta.pages ?? 1) === 1 && !meta.exif && !meta.icc && !meta.xmp && !meta.iptc && !meta.orientation && bytes.length <= MAX_STORED_BYTES
  return { format: meta.format, width: meta.width, height: meta.height, bytes: bytes.length, optimized }
}

export async function prepareImage(bytes) {
  const source = await inspectImage(bytes)
  const output = source.optimized ? bytes : await convertProductImage(bytes)
  const final = await inspectImage(output)
  if (!final.optimized) throw new Error('Converted output did not pass WebP validation / 4 MiB limit')
  return { source, output, converted: !source.optimized }
}

export async function fetchImage(url, { expectedHash, requireWebp = false } = {}) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS image sources are accepted')
  const response = await fetch(parsed, { signal: AbortSignal.timeout(30_000), redirect: 'error', cache: 'no-store' })
  if (!response.ok) throw new Error(`Image GET failed: HTTP ${response.status}`)
  if (Number(response.headers.get('content-length')) > MAX_SOURCE_BYTES) throw new Error('Remote image exceeds 32 MiB')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Image response has no body')
  const chunks = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > MAX_SOURCE_BYTES) { await reader.cancel(); throw new Error('Remote image exceeds 32 MiB') }
    chunks.push(value)
  }
  const bytes = Buffer.concat(chunks)
  const type = response.headers.get('content-type')?.split(';')[0].trim()
  if (requireWebp && type !== 'image/webp') throw new Error(`Expected image/webp; received ${type}`)
  if (expectedHash && sha256(bytes) !== expectedHash) throw new Error('Downloaded image hash differs from upload')
  return bytes
}

export async function loadSource(imageUrl, { root, supabaseUrl, storefrontUrl }) {
  if (!imageUrl) throw new Error('MISSING: product has no image_url')
  if (imageUrl.startsWith('/products/')) {
    const folder = await realpath(path.join(root, 'public', 'products'))
    let file
    try { file = await realpath(path.join(root, 'public', decodeURIComponent(imageUrl))) }
    catch (error) { if (error.code === 'ENOENT') throw new Error(`MISSING: local source ${imageUrl}`); throw error }
    const relative = path.relative(folder, file)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Local image path escapes public/products')
    return { bytes: await readFile(file), kind: 'local', source: file }
  }
  const url = new URL(imageUrl)
  // Do not fetch arbitrary catalogue URLs using a trusted local machine.
  const allowed = [new URL(supabaseUrl).origin, new URL(storefrontUrl).origin]
  if (!allowed.includes(url.origin)) throw new Error(`Unapproved external image origin: ${url.origin}. Download/review it separately; no database change made.`)
  return { bytes: await fetchImage(url), kind: url.origin === new URL(supabaseUrl).origin && url.pathname.startsWith('/storage/v1/') ? 'supabase-storage' : 'remote-storefront', source: url.href }
}

export function isManagedUrl(imageUrl, productId, supabaseUrl) {
  try {
    const url = new URL(imageUrl)
    return url.origin === new URL(supabaseUrl).origin && !url.search &&
      url.pathname.startsWith(`/storage/v1/object/public/${IMAGE_BUCKET}/products/${productId}/`) && url.pathname.endsWith('.webp')
  } catch { return false }
}

export async function readAll(client, table) {
  const rows = []
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from(table).select('*').order('id').range(start, start + 499)
    if (error) throw new Error(`Cannot read ${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 500) return rows
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}

export function catalogueFingerprint(products, variants) {
  const content = products.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => !['image_url', 'updated_at'].includes(key)))).sort((a, b) => a.id.localeCompare(b.id))
  return sha256(JSON.stringify(canonical({ products: content, variants: [...variants].sort((a, b) => a.id.localeCompare(b.id)) })))
}

export function managedStoragePath(imageUrl, productId, supabaseUrl) {
  if (!isManagedUrl(imageUrl, productId, supabaseUrl)) throw new Error('Not a managed product-images WebP URL')
  const objectPath = decodeURIComponent(new URL(imageUrl).pathname.split(`/${IMAGE_BUCKET}/`)[1])
  if (!new RegExp(`^products/${productId}/[a-f0-9-]{36}\\.webp$`, 'i').test(objectPath)) throw new Error('Invalid managed Storage path')
  return objectPath
}

export async function verifyStorageObject(client, objectPath, expectedHash, { allowMissing = false } = {}) {
  const { data, error } = await client.storage.from(IMAGE_BUCKET).download(objectPath)
  if (error) {
    // Supabase may return HTTP 400 for a missing object. Use its specific code,
    // never treat arbitrary HTTP 400/auth/network errors as permission to upload.
    const code = String(error.code ?? error.statusCode ?? '')
    if (allowMissing && (['NoSuchKey', 'NoSuchObject', 'ObjectNotFound', '404'].includes(code) ||
      (String(error.statusCode) === '400' && /^(object not found|the resource was not found)$/i.test(error.message)))) return null
    throw new Error(`Storage download failed (${code}): ${error.message}`)
  }
  if (!data || !data.size) throw new Error('Storage object is empty')
  if (data.size > MAX_STORED_BYTES) throw new Error('Storage object exceeds 4 MiB')
  const mime = data.type?.split(';')[0].trim().toLowerCase()
  if (mime && mime !== 'image/webp') throw new Error(`Expected image/webp; received ${mime}`)
  const bytes = Buffer.from(await data.arrayBuffer())
  const meta = await inspectImage(bytes)
  if (!meta.optimized) throw new Error('Stored bytes are not optimized WebP')
  const hash = sha256(bytes)
  if (expectedHash && hash !== expectedHash) throw new Error('Stored object hash differs from intended image')
  return { bytes, meta, hash }
}

export async function migrateOne(product, { source, client, root, supabaseUrl, storefrontUrl, dryRun, resume }) {
  const report = {
    id: product.id, slug: product.slug, name: product.name_ar, active: product.is_active,
    currentImageUrl: product.image_url,
    converted: false, alreadyUploaded: false, verified: false, uploaded: false, updated: false, skipped: false,
  }
  try {
    if (isManagedUrl(product.image_url, product.id, supabaseUrl)) {
      const objectPath = managedStoragePath(product.image_url, product.id, supabaseUrl)
      const stored = await verifyStorageObject(client, objectPath)
      Object.assign(report, { ...stored.meta, sha256: stored.hash, intendedImageUrl: product.image_url,
        intendedStoragePath: objectPath, alreadyUploaded: true, verified: true, skipped: true })
      return report
    }
    let destination
    let output
    let stored
    // Previous reports provide the exact content-addressed object and full hash.
    // Reuse it without even reading/re-encoding the original source image.
    if (resume && resume.id === product.id && resume.currentImageUrl === product.image_url && /^[a-f0-9]{64}$/.test(resume.sha256 ?? '')) {
      destination = managedStoragePath(resume.intendedImageUrl, product.id, supabaseUrl)
      if (destination !== resume.intendedStoragePath) throw new Error('Resume report Storage path mismatch')
      stored = await verifyStorageObject(client, destination, resume.sha256, { allowMissing: true })
      if (stored) {
        if (storagePath(product.id, stored.bytes) !== destination) throw new Error('Resume object is not the intended content-addressed image')
        Object.assign(report, { source: resume.source, sourceKind: 'previous-migration', ...stored.meta, conversionRequired: false })
      }
    }
    if (!stored) {
      const loaded = source ?? await loadSource(product.image_url, { root, supabaseUrl, storefrontUrl })
      const prepared = await prepareImage(loaded.bytes)
      output = prepared.output
      destination = storagePath(product.id, output)
      Object.assign(report, { source: loaded.source, sourceKind: loaded.kind, ...prepared.source,
        conversionRequired: prepared.converted, converted: !dryRun && prepared.converted })
      stored = await verifyStorageObject(client, destination, sha256(output), { allowMissing: true })
    }
    const newUrl = client.storage.from(IMAGE_BUCKET).getPublicUrl(destination).data.publicUrl
    Object.assign(report, { intendedStoragePath: destination, intendedImageUrl: newUrl,
      outputBytes: stored?.bytes.length ?? output.length, sha256: stored?.hash ?? sha256(output),
      alreadyUploaded: Boolean(stored), verified: Boolean(stored) })
    if (dryRun) return report
    if (!stored) {
      const { error: uploadError } = await client.storage.from(IMAGE_BUCKET).upload(destination, output, { contentType: 'image/webp', cacheControl: '31536000', upsert: false })
      if (uploadError && !['409', 'Duplicate', 'ResourceAlreadyExists'].includes(String(uploadError.statusCode ?? uploadError.code))) throw new Error(`Upload failed: ${uploadError.message}`)
      report.uploaded = !uploadError
      report.alreadyUploaded = Boolean(uploadError)
      await verifyStorageObject(client, destination, report.sha256)
      report.verified = true
    }
    let query = client.from('products').update({ image_url: newUrl }).eq('id', product.id).eq('updated_at', product.updated_at)
    query = product.image_url === null ? query.is('image_url', null) : query.eq('image_url', product.image_url)
    const { data, error } = await query.select('id,image_url').single()
    if (error || data?.image_url !== newUrl) throw new Error(`Database update rejected or uncertain (refresh before retry): ${error?.message ?? 'URL mismatch'}`)
    report.updated = true
    const { data: reread, error: readError } = await client.from('products').select('*').eq('id', product.id).single()
    if (readError || reread?.image_url !== newUrl) throw new Error('Post-save URL verification failed; inspect database before retrying')
    if (catalogueFingerprint([product], []) !== catalogueFingerprint([reread], [])) throw new Error('Non-image product data changed; inspect concurrent edits')
    return report
  } catch (error) {
    // Never remove originals or newly uploaded objects on ambiguous outcomes.
    error.report = report
    throw error
  }
}
