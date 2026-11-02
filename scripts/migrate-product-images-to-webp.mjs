#!/usr/bin/env node
import { readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { IMAGE_BUCKET, readAll, migrateOne, catalogueFingerprint, verifyStorageObject, managedStoragePath } from './lib/product-image-migration.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
nextEnv.loadEnvConfig(root)

const argv = process.argv.slice(2)
const args = {}
for (let i = 0; i < argv.length; i++) {
  const flag = argv[i]
  if (['--dry-run', '--verify-only', '--use-secret', '--help'].includes(flag)) args[flag.slice(2)] = true
  else if (['--storefront-url', '--baseline'].includes(flag) && argv[i + 1] && !argv[i + 1].startsWith('--')) args[flag.slice(2)] = argv[++i]
  else throw new Error(`Unknown/missing argument: ${flag}`)
}
if (args.help) {
  console.log('npm run images:migrate-webp -- [--dry-run | --verify-only] [--use-secret] [--storefront-url https://site.example] [--baseline report.json]\nDefault auth: MIGRATION_ADMIN_ACCESS_TOKEN + existing public Supabase config. Explicit --use-secret uses local SUPABASE_SECRET_KEY. Nothing runs during build/dev/start. No cleanup is performed.')
  process.exit(0)
}
if (args['dry-run'] && args['verify-only']) throw new Error('Choose --dry-run or --verify-only, not both')

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const token = process.env.MIGRATION_ADMIN_ACCESS_TOKEN
  const key = args['use-secret'] ? process.env.SUPABASE_SECRET_KEY : publicKey
  if (!supabaseUrl || !key || (!args['use-secret'] && !token)) throw new Error('Set MIGRATION_ADMIN_ACCESS_TOKEN for admin/RLS auth, or explicitly pass --use-secret to use the existing local SUPABASE_SECRET_KEY. Anonymous reads omit inactive products and are not accepted.')
  if (args['use-secret'] && !key.startsWith('sb_secret_')) {
    let role
    try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role } catch { /* invalid credential; rejected below */ }
    if (role !== 'service_role') throw new Error('SUPABASE_SECRET_KEY must be a server secret/service-role key, not an anon/publishable key')
  }
  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: token && !args['use-secret'] ? { headers: { Authorization: `Bearer ${token}` } } : {},
  })
  if (!args['use-secret']) {
    const { data, error } = await client.rpc('is_admin')
    if (error || data !== true) throw new Error('Admin session is expired or not authorized by public.is_admin()')
  }
  const storefrontUrl = args['storefront-url'] ?? 'https://you-and-me-cosmetics.netlify.app'
  if (new URL(storefrontUrl).protocol !== 'https:') throw new Error('Storefront URL must use HTTPS')
  const products = await readAll(client, 'products')
  const variants = await readAll(client, 'product_variants')
  const bucket = await client.storage.getBucket(IMAGE_BUCKET)
  // getBucket is restricted to elevated credentials on some Supabase projects.
  // Admin mode uses object RLS; authenticated download/MIME/hash validation is authoritative.
  if (args['use-secret'] && (bucket.error || !bucket.data?.public || !bucket.data.allowed_mime_types?.includes('image/webp'))) throw new Error('product-images bucket missing, private or not configured for WebP. Apply the existing Storage setup; no bucket is automatically created.')
  console.log(`Authentication: ${args['use-secret'] ? 'explicit local secret (never sent to image hosts)' : 'authenticated admin / RLS'}`)
  console.log(`Bucket: ${bucket.data ? 'public product-images, WebP enabled' : 'metadata unavailable to admin role; object operations will use RLS'}`)
  console.log(`Catalogue: ${products.length} products (${products.filter(p => p.is_active).length} active), ${variants.length} variants`)
  const report = {
    startedAt: new Date().toISOString(), mode: args['dry-run'] ? 'dry-run' : args['verify-only'] ? 'verify-only' : 'migrate',
    supabaseUrl, storefrontUrl, beforeFingerprint: catalogueFingerprint(products, variants),
    before: { products, variants }, items: [], failures: [],
    totals: { productsChecked: products.length, alreadyUploaded: 0, verified: 0, alreadyWebp: 0, conversionRequired: 0, converted: 0, uploaded: 0, databaseRecordsUpdated: 0, skipped: 0, missingSourceImages: 0, failed: 0 },
  }
  const folder = path.join(root, '.image-migration-reports')
  await mkdir(folder, { recursive: true })
  const resumePlans = new Map()
  for (const filename of (await readdir(folder)).filter(name => name.endsWith('.json')).sort()) {
    try {
      const previous = JSON.parse(await readFile(path.join(folder, filename), 'utf8'))
      if (previous.supabaseUrl !== supabaseUrl) continue
      for (const item of previous.items ?? []) {
        if (item.intendedStoragePath && item.intendedImageUrl && item.sha256) resumePlans.set(`${item.id}:${item.currentImageUrl}`, item)
      }
    } catch { console.warn(`Ignoring unreadable previous report: ${filename}`) }
  }
  const reportFile = path.join(folder, `${report.startedAt.replaceAll(':', '-')}-${report.mode}.json`)
  const persist = async () => {
    await writeFile(`${reportFile}.tmp`, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 })
    await rename(`${reportFile}.tmp`, reportFile)
  }
  await persist() // Durable baseline before the first upload or database mutation.

  try {
    for (const product of products) {
      let item
      try {
        if (args['verify-only']) {
          const objectPath = managedStoragePath(product.image_url, product.id, supabaseUrl)
          const stored = await verifyStorageObject(client, objectPath)
          item = { id: product.id, slug: product.slug, name: product.name_ar, currentImageUrl: product.image_url, format: stored.meta.format, alreadyUploaded: true, verified: true, skipped: true }
        } else item = await migrateOne(product, { client, root, supabaseUrl, storefrontUrl, dryRun: args['dry-run'], resume: resumePlans.get(`${product.id}:${product.image_url}`) })
      } catch (error) {
        item = error.report ?? { id: product.id, slug: product.slug, name: product.name_ar, currentImageUrl: product.image_url }
        item.error = error.message
        report.failures.push({ id: product.id, slug: product.slug, reason: error.message })
        report.totals.failed++
        if (error.message.startsWith('MISSING:')) report.totals.missingSourceImages++
      }
      report.items.push(item)
      if (item.format === 'webp') report.totals.alreadyWebp++
      for (const key of ['alreadyUploaded', 'verified', 'conversionRequired', 'converted', 'uploaded', 'skipped']) if (item[key]) report.totals[key]++
      if (item.updated) report.totals.databaseRecordsUpdated++
      console.log(JSON.stringify(item))
      await persist()
    }
    const afterProducts = await readAll(client, 'products')
    const afterVariants = await readAll(client, 'product_variants')
    report.afterFingerprint = catalogueFingerprint(afterProducts, afterVariants)
    report.webpRecords = afterProducts.filter(product => product.image_url?.endsWith('.webp')).length
    report.catalogueContentUnchanged = report.afterFingerprint === report.beforeFingerprint
    if (!report.catalogueContentUnchanged) throw new Error('Catalogue content/variants changed during this run. Review the baseline for concurrent edits; no automatic rollback is attempted.')
    for (const item of report.items.filter(i => i.updated)) {
      if (afterProducts.find(p => p.id === item.id)?.image_url !== item.intendedImageUrl) throw new Error(`Final image URL mismatch: ${item.slug}`)
    }
    if (args.baseline) {
      const baseline = JSON.parse(await readFile(path.resolve(args.baseline), 'utf8'))
      if (baseline.supabaseUrl !== supabaseUrl || baseline.beforeFingerprint !== report.afterFingerprint) throw new Error('Baseline catalogue differs from current catalogue/project')
      for (const item of baseline.items.filter(i => i.updated)) {
        const product = afterProducts.find(p => p.id === item.id)
        if (product?.image_url !== item.intendedImageUrl) throw new Error(`Baseline migrated URL changed: ${item.slug}`)
        await verifyStorageObject(client, managedStoragePath(product.image_url, product.id, supabaseUrl), item.sha256)
      }
      report.baselineVerified = true
    }
  } catch (error) { report.finalError = error.message; process.exitCode = 1 }
  report.completedAt = new Date().toISOString()
  await persist()
  console.log('\nMigration report:', JSON.stringify(report.totals, null, 2))
  for (const failure of report.failures) console.error(`${failure.slug} (${failure.id}): ${failure.reason}`)
  if (report.finalError) console.error(report.finalError)
  console.log(`Catalogue content unchanged: ${report.catalogueContentUnchanged ?? 'verification incomplete'}`)
  console.log(`Report / original URL backup: ${reportFile}`)
  if (report.totals.failed) process.exitCode = 1
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
