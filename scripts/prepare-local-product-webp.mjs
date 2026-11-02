#!/usr/bin/env node
// Explicit local-only helper. Never runs seed:build or connects to Supabase.
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareImage, sha256 } from './lib/product-image-migration.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const folder = path.join(root, 'public/products')
const files = (await readdir(folder)).filter(file => /\.(jpe?g|png)$/i.test(file)).sort()
const replacements = new Map()
let sourceBytes = 0
let outputBytes = 0
for (const file of files) {
  const input = await readFile(path.join(folder, file))
  const { output } = await prepareImage(input)
  const destination = file.replace(/\.[^.]+$/, '.webp')
  try { await writeFile(path.join(folder, destination), output, { flag: 'wx' }) }
  catch (error) {
    if (error.code !== 'EEXIST') throw error
    if (sha256(await readFile(path.join(folder, destination))) !== sha256(output)) throw new Error(`Existing WebP differs: ${destination}; review manually, never overwritten`)
  }
  replacements.set(`/products/${file}`, `/products/${destination}`)
  sourceBytes += input.length
  outputBytes += output.length
}
// Replace only exact image path strings, without regenerating catalogue content.
for (const relative of ['src/data/preview-products.json', 'src/components/Hero.tsx', 'src/components/StorySection.tsx']) {
  const file = path.join(root, relative)
  const previous = await readFile(file, 'utf8')
  let next = previous
  for (const [from, to] of replacements) next = next.replaceAll(from, to)
  if (relative.endsWith('.json')) {
    const stripImages = values => values.map(value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'imageUrl')))
    if (JSON.stringify(stripImages(JSON.parse(previous))) !== JSON.stringify(stripImages(JSON.parse(next)))) throw new Error('Unexpected preview catalogue change')
  }
  if (previous !== next) await writeFile(file, next)
}
console.log(JSON.stringify({ images: files.length, sourceBytes, outputBytes, reductionPercent: Math.round((1 - outputBytes / sourceBytes) * 100), originalsDeleted: 0 }, null, 2))
