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
    const page = await browser.newPage()
    await page.setViewport({ width, height: 900 })
    await page.setCacheEnabled(false)
    await page.evaluateOnNewDocument(() => sessionStorage.setItem('intro-played', '1'))
    await page.setRequestInterception(true)
    page.on('request', request => {
      if (request.resourceType() === 'image' && request.url().includes('product-images')) void request.abort()
      else if (request.url().includes('_rsc=')) setTimeout(() => { void request.continue().catch(() => {}) }, 800)
      else void request.continue()
    })
    await page.goto(origin + '/category/all', { waitUntil: 'networkidle0', timeout: 120000 })
    await page.waitForSelector('article[data-testid] .product-image-fallback')
    const routes = await page.$$eval('.store-departments a', links => links.slice(0, 3).map(e => e.getAttribute('href')))
    assert.equal(routes.length, 3)
    await page.evaluate(routes => {
      const click = path => document.querySelector('.store-departments a[href="' + path + '"]').click()
      click(routes[0]); click(routes[0]); click(routes[1]); click(routes[2])
    }, routes)
    await page.waitForFunction(path => document.querySelector('[data-store-route]')?.dataset.storeRoute === path, { timeout: 60000 }, routes[2])
    await page.goto(origin + '/category/all', { waitUntil: 'networkidle0' })
    await page.click('.filter-open')
    await page.waitForSelector('.filter-dialog[open]')
    await page.click('button[aria-label="إغلاق التصفية"]')
    await page.waitForFunction(() => !document.querySelector('.filter-dialog[open]'))
    const add = await page.$('article[data-testid]:not(:has(select)) button[aria-busy="false"]:not(:disabled)')
    if (add) {
      await add.click()
      await page.waitForSelector('.mobile-shopping-bar.is-visible,.header-bag span')
      if (width < 768) {
        await page.waitForFunction(() => { const bar = document.querySelector('.mobile-shopping-bar button'); const r = bar?.getBoundingClientRect(); return r && r.height > 0 && r.bottom <= innerHeight && r.top >= 0 })
        await page.click('.mobile-shopping-bar button')
        await page.waitForSelector('.cart-dialog[open]')
        await page.keyboard.press('Escape')
        await page.waitForFunction(() => !document.querySelector('.cart-dialog[open]'))
      }
    }
    results.push({ width, failedImagesHandled: true, latestNavigationWon: true, filterClosed: true, cartChecked: Boolean(add) })
    console.log(JSON.stringify(results.at(-1)))
    await page.close()
  }
} finally {
  await writeFile('artifacts/category-response/failure-rapid.json', JSON.stringify(results, null, 2))
  await browser.close()
}
