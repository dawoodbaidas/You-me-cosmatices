import { writeFile, mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const label = process.argv[2] ?? 'before'
const origin = process.argv[3] ?? 'http://localhost:3012'
assert.match(label, /^[a-z-]+$/)
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const products = await fetch(origin + '/api/store/products').then(r => r.json())
assert.ok(Array.isArray(products) && products.length)
const results = []
for (const path of ['/', '/cart', '/favorites', '/products/' + encodeURIComponent(products[0].slug), '/category/all']) {
  for (let run = 0; run < 5; run++) {
    const start = performance.now(), time = Date.now()
    const response = await fetch(origin + path)
    const headersMs = performance.now() - start
    const body = await response.text()
    assert.equal(response.status, 200)
    results.push({ path, run, time, headersMs, bodyMs: performance.now() - start, bytes: Buffer.byteLength(body), cacheControl: response.headers.get('cache-control') })
  }
}
const images = []
for (const product of products.filter(p => p.imageUrl).slice(0, 3)) {
  const url = origin + '/_next/image?' + new URLSearchParams({ url: product.imageUrl, w: '640', q: '75' })
  for (const visit of ['first', 'repeat']) {
    const start = performance.now()
    const response = await fetch(url)
    const bytes = (await response.arrayBuffer()).byteLength
    images.push({ source: product.imageUrl, visit, status: response.status, bytes, ms: performance.now() - start, cache: response.headers.get('x-nextjs-cache'), cacheControl: response.headers.get('cache-control') })
  }
}
await mkdir('artifacts/data-performance', { recursive: true })
await writeFile(`artifacts/data-performance/${label}-routes.json`, JSON.stringify({ results, images }, null, 2))
console.log(JSON.stringify({ routes: results.length, images: images.length }))
