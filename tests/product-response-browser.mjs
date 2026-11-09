import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const origin = process.argv[2] ?? 'http://localhost:3016'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
await mkdir('artifacts/category-response', { recursive: true })
try {
  for (const width of [360, 390, 1440]) {
    const context = await browser.createBrowserContext(), page = await context.newPage(), errors = [], api = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('request', r => { if (r.url().includes('/api/store/products')) api.push(r.url()) })
    await page.setViewport({ width, height: 900, hasTouch: width < 768, isMobile: width < 768 })
    await page.setCacheEnabled(false)
    await page.evaluateOnNewDocument(() => sessionStorage.setItem('intro-played', '1'))
    await page.goto(origin + '/category/all', { waitUntil: 'networkidle0', timeout: 120000 })
    await page.waitForSelector('article[data-testid] img')
    const before = await page.$eval('article[data-testid] img', image => ({ box: image.parentElement.getAttribute('style'), background: image.parentElement.parentElement.style.background }))
    const imageButton = 'article[data-testid] button[aria-label^="عرض تفاصيل"]'
    for (const cache of ['cold', 'warm']) {
      const count = api.length
      const start = performance.now()
      await page.click(imageButton)
      await page.waitForSelector('[data-testid="product-quickview"]', { visible: true })
      const quickView = performance.now() - start
      await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="product-quickview"] img')].every(i => i.complete && i.naturalWidth))
      await page.screenshot({ path: `artifacts/category-response/quickview-${width}-${cache}.png` })
      assert.equal(api.length - count, 0, 'Quick View must reuse loaded products')
      await page.click('[data-testid="product-quickview"] button[aria-label="إغلاق"]')
      await page.waitForFunction(() => !document.querySelector('[data-testid="product-quickview"]'))
      results.push({ width, cache, quickView, duplicateDataRequests: api.length - count })
    }
    const after = await page.$eval('article[data-testid] img', image => ({ box: image.parentElement.getAttribute('style'), background: image.parentElement.parentElement.style.background }))
    assert.deepEqual(before, after, 'Image framing and background must remain stable')
    const whatsapp = await page.$$eval('a[href^="https://wa.me/"]', links => links.map(link => ({ url: link.href, target: link.target, rel: link.rel })))
    for (const link of whatsapp) {
      const url = new URL(link.url)
      assert.match(url.pathname, /^\/\d+$/)
      assert.ok(url.searchParams.get('text'))
      assert.equal(link.target, '_blank')
      assert.ok(link.rel.includes('noopener'))
    }
    assert.deepEqual(errors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.goto(origin, { waitUntil: 'networkidle0' })
    await page.waitForFunction(() => [...document.querySelectorAll('#home img')].every(i => i.complete))
    await page.screenshot({ path: `artifacts/category-response/hero-${width}.png` })
    console.log(JSON.stringify({ width, results: results.filter(r => r.width === width), whatsappLinks: whatsapp.length, stableFraming: true }))
    await context.close()
  }
} finally {
  await writeFile('artifacts/category-response/products.json', JSON.stringify(results, null, 2))
  await browser.close()
}
