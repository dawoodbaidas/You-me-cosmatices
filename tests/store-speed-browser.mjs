import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const [origin = 'http://localhost:3015', database] = process.argv.slice(2)
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
await mkdir('artifacts/store-speed', { recursive: true })
try {
  const page = await browser.newPage(), errors = [], consoleErrors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('intro-played', '1'))
  if (database) {
    assert.equal(new URL(database).hostname, '127.0.0.1')
    assert.equal(new URL(origin).hostname, '127.0.0.1')
    for (const price of [8, 7]) {
      const result = await fetch(database + '/__test/merchandising', { method: 'POST', body: JSON.stringify({ slug: 'body-mist', originalPrice: 10, price, discountEnabled: true, isNew: false }) })
      assert.equal(result.status, 200)
      await page.goto(origin + '/category/perfumes', { waitUntil: 'networkidle0' })
      const text = await page.$eval('[data-testid="product-body-mist"] [data-price-tag]', e => e.innerText)
      assert.ok(text.includes(price.toFixed(2)), text)
      const products = await page.evaluate(async () => (await fetch('/api/store/products?category=perfumes')).json())
      assert.equal(products.find(p => p.slug === 'body-mist').price, price)
    }
    console.log('PASS: committed price changes invalidate warmed category and ID display data (isolated DB)')
    results.push({ priceUpdates: [8, 7], consoleErrors })
  } else {
    for (const width of [320, 390, 430, 768, 1440]) {
      await page.setViewport({ width, height: 900 })
      await page.goto(origin, { waitUntil: 'networkidle0' })
      await page.waitForSelector('[data-hero-product]:not([inert])')
      await page.waitForFunction(() => [...document.querySelectorAll('#home img')].every(i => i.complete && i.naturalWidth))
      const hero = await page.$$eval('[data-hero-product]', els => els.map(e => e.dataset.heroProduct))
      await page.screenshot({ path: `artifacts/store-speed/home-${width}.png` })
      await page.$eval('#bestsellers', e => e.scrollIntoView({ behavior: 'instant' }))
      await page.waitForFunction(() => [...document.querySelectorAll('#bestsellers img')].some(i => i.complete && i.naturalWidth))
      await page.screenshot({ path: `artifacts/store-speed/best-${width}.png` })
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
      const y = await page.evaluate(() => scrollY)
      const routes = await page.$$eval('a[href^="/categories/"]', els => [...new Set(els.map(e => e.getAttribute('href')))].slice(0, 3))
      await page.evaluate(route => document.querySelector(`a[href="${route}"]`).click(), routes[0])
      await page.waitForFunction(route => document.querySelector('[data-store-route]')?.dataset.storeRoute === route, {}, routes[0])
      assert.ok(await page.evaluate(() => scrollY < 5))
      await page.goBack({ waitUntil: 'networkidle0' })
      await page.waitForFunction(previous => Math.abs(scrollY - previous) < 5, {}, y)
      assert.deepEqual(await page.$$eval('[data-hero-product]', els => els.map(e => e.dataset.heroProduct)), hero)
      await page.goForward({ waitUntil: 'networkidle0' })
      await page.evaluate(routes => {
        document.querySelector(`a[href="${routes[1]}"]`).click()
        document.querySelector(`a[href="${routes[2]}"]`).click()
      }, routes)
      await page.waitForFunction(route => document.querySelector('[data-store-route]')?.dataset.storeRoute === route, {}, routes[2])
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      results.push({ width, hero, scrollRestored: true, latestNavigationWon: true })
      console.log('PASS', width, 'hero/images, back/forward scroll, rapid navigation, overflow')
    }
  }
  assert.deepEqual(errors, [])
  if (!database) assert.deepEqual(consoleErrors, [])
} finally {
  await writeFile(`artifacts/store-speed/${database ? 'invalidation' : 'browser'}-qa.json`, JSON.stringify(results, null, 2))
  await browser.close()
}
