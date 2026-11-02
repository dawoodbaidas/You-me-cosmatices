#!/usr/bin/env node
/**
 * Build the Supabase seed + local preview snapshot from the ORIGINAL project files.
 *
 *   node scripts/build-import.mjs
 *
 * Inputs (override with flags):
 *   --products <file>   extracted product catalogue   (default ../products_from_html.json)
 *   --prices   <file>   original pricing JSON         (default ../you-and-me-prices.json)
 *   --images   <dir>    exported product images       (default ./public/products)
 *   --out      <file>   generated SQL seed            (default ./supabase/seed.sql)
 *   --preview  <file>   generated preview snapshot    (default ./src/data/preview-products.json)
 *
 * The generated `preview-products.json` is ONLY used when PREVIEW_WITHOUT_SUPABASE=true,
 * i.e. a local, opt-in, offline design preview. It is never used when Supabase is
 * configured — Supabase is the single source of truth for prices.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '..')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true
    out[key] = value
    if (typeof value === 'string') i += 1
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const resolve = (value, fallback) =>
  path.resolve(projectRoot, typeof value === 'string' ? value : fallback)

const productsFile = resolve(args.products, '../products_from_html.json')
const pricesFile = resolve(args.prices, '../you-and-me-prices.json')
const imagesDir = resolve(args.images, './public/products')
const outFile = resolve(args.out, './supabase/seed.sql')
const previewFile = resolve(args.preview, './src/data/preview-products.json')

/* ------------------------------------------------------------------ helpers */

const sqlString = (value) =>
  value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`

const sqlNumber = (value) => (value === null || value === undefined ? 'NULL' : String(value))

const sqlJson = (value) =>
  value === null || value === undefined ? 'NULL' : `${sqlString(JSON.stringify(value))}::jsonb`

/* ------------------------------------------------------------ image lookups */

const imageFiles = (await readdir(imagesDir)).filter((f) => !f.startsWith('.'))
  .sort((a, b) => Number(!a.endsWith('.webp')) - Number(!b.endsWith('.webp')) || a.localeCompare(b))
const imageBySlug = new Map()
for (const file of imageFiles) {
  const slug = file.replace(/\.[^.]+$/, '')
  if (!imageBySlug.has(slug)) imageBySlug.set(slug, file)
}

/* -------------------------------------------------------------------- input */

const products = JSON.parse(await readFile(productsFile, 'utf8'))
const prices = JSON.parse(await readFile(pricesFile, 'utf8'))

/* ------------------------------------------------------------- match report */

const productIds = products.map((p) => p.id)
const duplicateIds = productIds.filter((id, i) => productIds.indexOf(id) !== i)
const priceKeys = Object.keys(prices)

const missingPrice = productIds.filter((id) => !Object.prototype.hasOwnProperty.call(prices, id))
const missingProduct = priceKeys.filter((id) => !productIds.includes(id))

const variantReport = []
const unmatchedVariantLabels = []

for (const product of products) {
  const entry = prices[product.id]
  const htmlLabels = (product.variants ?? []).map((v) => v.label)
  const jsonLabels = entry ? Object.keys(entry.variantPrices ?? {}) : []

  const labelsMissingFromJson = htmlLabels.filter((l) => !jsonLabels.includes(l))
  const labelsMissingFromHtml = jsonLabels.filter((l) => !htmlLabels.includes(l))
  labelsMissingFromJson.forEach((l) => unmatchedVariantLabels.push(`${product.id} :: ${l}`))

  variantReport.push({
    id: product.id,
    htmlVariants: htmlLabels.length,
    jsonVariants: jsonLabels.length,
    labelsMissingFromJson,
    labelsMissingFromHtml,
  })
}

const missingImages = productIds.filter((id) => !imageBySlug.has(id))

const report = {
  generatedFor: 'You & Me Cosmetics — Supabase import',
  jsonPriceKeys: priceKeys.length,
  htmlProducts: products.length,
  variants: products.reduce((sum, p) => sum + (p.variants?.length ?? 0), 0),
  duplicateProductIds: [...new Set(duplicateIds)],
  productsWithoutPrice: missingPrice,
  pricesWithoutProduct: missingProduct,
  variantsInJsonNotFoundInHtml: unmatchedVariantLabels,
  productsWithoutImage: missingImages,
}

const perProduct = variantReport
  .filter((r) => r.htmlVariants || r.jsonVariants)
  .map(
    (r) =>
      `  ${r.id.padEnd(40)} html=${String(r.htmlVariants).padStart(2)} json=${String(
        r.jsonVariants,
      ).padStart(2)}` +
      (r.labelsMissingFromJson.length ? `  html-only: ${r.labelsMissingFromJson.join(', ')}` : '') +
      (r.labelsMissingFromHtml.length ? `  json-only: ${r.labelsMissingFromHtml.join(', ')}` : ''),
  )

console.log('\n=== You & Me Cosmetics import report ===')
console.log(`  JSON price keys ............. ${report.jsonPriceKeys}`)
console.log(`  Products in original UI ..... ${report.htmlProducts}`)
console.log(`  Variants .................... ${report.variants}`)
console.log(`  Duplicate product ids ....... ${report.duplicateProductIds.length || 'none'}`)
console.log(`  Products with no JSON price . ${report.productsWithoutPrice.length || 'none'}`)
console.log(`  JSON prices with no product . ${report.pricesWithoutProduct.length || 'none'}`)
console.log(`  Variants in JSON not in UI .. ${report.variantsInJsonNotFoundInHtml.length || 'none'}`)
console.log(`  Products with no image file . ${report.productsWithoutImage.length || 'none'}`)
if (perProduct.length) {
  console.log('\n  Per-product variant coverage:')
  console.log(perProduct.join('\n'))
}

const fatal =
  report.productsWithoutPrice.length +
  report.pricesWithoutProduct.length +
  report.duplicateProductIds.length +
  report.productsWithoutImage.length

/* ------------------------------------------------------------------- prices */

/** Price for a product = the latest price from you-and-me-prices.json. */
const priceOf = (product) => {
  const entry = prices[product.id]
  return typeof entry?.price === 'number' ? entry.price : product.price
}

/** Variant price = variantPrices[label], falling back to the product price. */
const variantPriceOf = (product, label) => {
  const entry = prices[product.id]
  const map = entry?.variantPrices
  if (map && typeof map[label] === 'number') return map[label]
  const htmlVariant = product.variants?.find((v) => v.label === label)
  return htmlVariant?.price ?? priceOf(product)
}

/* -------------------------------------------------------------- seed output */

const now = new Date().toISOString()
const lines = []
lines.push('-- You & Me Cosmetics — Supabase seed')
lines.push('-- GENERATED FILE — do not edit by hand.')
lines.push('-- Regenerate with:  npm run seed:build')
lines.push(`-- Source products: ${path.basename(productsFile)} (${products.length} products)`)
lines.push(`-- Source prices:   ${path.basename(pricesFile)} (${priceKeys.length} entries)`)
lines.push(`-- Generated at:    ${now}`)
lines.push('')
lines.push("set search_path = public, extensions;")
lines.push('')
lines.push('-- Wipe catalogue data only (site_settings is preserved).')
lines.push('delete from public.product_variants;')
lines.push('delete from public.products;')
lines.push('')

products.forEach((product) => {
  const image = imageBySlug.get(product.id)
  const imageUrl = image ? `/products/${image}` : null
  const price = priceOf(product)
  const benefits = product.benefits ?? []
  const badge = product.badge || null
  const oldPrice =
    typeof product.oldPrice === 'number' && product.oldPrice > price ? product.oldPrice : null

  lines.push(`-- ${product.id} — ${product.nameEn}`)
  lines.push('insert into public.products (')
  lines.push('  slug, name_ar, name_en, description, category, category_label,')
  lines.push('  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order')
  lines.push(') values (')
  lines.push(`  ${sqlString(product.id)},`)
  lines.push(`  ${sqlString(product.nameAr)},`)
  lines.push(`  ${sqlString(product.nameEn)},`)
  lines.push(`  ${sqlString(product.desc ?? null)},`)
  lines.push(`  ${sqlString(product.category)},`)
  lines.push(`  ${sqlString(product.categoryLabel)},`)
  lines.push(`  ${sqlNumber(price)},`)
  lines.push(`  ${sqlNumber(oldPrice)},`)
  lines.push(`  ${sqlString(imageUrl)},`)
  lines.push(`  ${sqlString(badge)},`)
  lines.push(`  ${sqlJson(benefits)},`)
  lines.push('  true,')
  lines.push(`  ${badge ? 'true' : 'false'},`)
  lines.push(`  ${productIds.indexOf(product.id)}`)
  lines.push(');')

  const variants = product.variants ?? []
  if (variants.length) {
    lines.push(`delete from public.product_variants where product_id = (select id from public.products where slug = ${sqlString(product.id)});`)
    lines.push('insert into public.product_variants (product_id, label, price, is_active, sort_order)')
    lines.push(`select p.id, v.label, v.price, true, v.sort_order`)
    lines.push(`from public.products p`)
    lines.push(`cross join (values ${variants
      .map((variant, index) => {
        const variantPrice = variantPriceOf(product, variant.label)
        return `(${sqlString(variant.label)}::text, ${sqlNumber(variantPrice)}::numeric, ${index})`
      })
      .join(', ')}) as v(label, price, sort_order)`)
    lines.push('where p.slug = ' + sqlString(product.id) + ';')
  }

  lines.push('')
})

lines.push('-- ---------------------------------------------------------------- settings')
lines.push('insert into public.site_settings (key, value) values')
lines.push("  ('whatsapp_number', '962777260622'),")
lines.push("  ('whatsapp_message', 'مرحباً You and Me Cosmetics 💘\\nأرغب بطلب المنتجات التالية:'),")
lines.push("  ('email', 'youme.work20@gmail.com'),")
lines.push("  ('instagram_url', ''),")
lines.push("  ('facebook_url', ''),")
lines.push("  ('currency', 'JOD'),")
lines.push("  ('store_tagline', 'لأن جمالك قصة، ونحن نهتم بتفاصيلها.'),")
lines.push("  ('store_announcement', 'توصيل سريع في الأردن • دفع عند الاستلام'),")
lines.push("  ('store_free_shipping_threshold', '25')")
lines.push('on conflict (key) do update set value = excluded.value, updated_at = now();')
lines.push('')

await writeFile(outFile, lines.join('\n'), 'utf8')

/* --------------------------------------------------------- preview snapshot */

const preview = products.map((product, index) => {
  const image = imageBySlug.get(product.id)
  const price = priceOf(product)
  return {
    // `slug` mirrors the database column; in preview mode the id is used as the
    // slug so links and filters behave exactly as they do on Supabase.
    slug: product.id,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    description: product.desc ?? null,
    category: product.category,
    categoryLabel: product.categoryLabel,
    price,
    oldPrice:
      typeof product.oldPrice === 'number' && product.oldPrice > price ? product.oldPrice : null,
    imageUrl: image ? `/products/${image}` : null,
    badge: product.badge || null,
    benefits: product.benefits ?? [],
    isActive: true,
    isFeatured: Boolean(product.badge),
    sortOrder: index,
    variants: (product.variants ?? []).map((variant, vIndex) => ({
      id: `${product.id}::${variant.label}`,
      label: variant.label,
      price: variantPriceOf(product, variant.label),
      isActive: true,
      sortOrder: vIndex,
    })),
  }
})

await writeFile(previewFile, `${JSON.stringify(preview, null, 2)}\n`, 'utf8')

console.log(`\n  Wrote ${path.relative(projectRoot, outFile)}`)
console.log(`  Wrote ${path.relative(projectRoot, previewFile)}`)
console.log(`  Images resolved from ${path.relative(projectRoot, imagesDir)}\n`)

if (!existsSync(outFile)) process.exit(1)
if (fatal > 0) {
  console.error(`✗ ${fatal} blocking mismatch(es) found — seed may be incomplete.\n`)
  process.exit(1)
}
console.log('✓ all products, variants and images matched.\n')
