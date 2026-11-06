// Use the URL printed by `npm run test:store-browser -- --production`.
// PUPPETEER_MODULE can point at an existing external puppeteer-core installation.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const origin = process.argv[2]
assert.ok(origin && new URL(origin).hostname === '127.0.0.1', 'Pass the isolated browser QA URL')
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ?? 'puppeteer-core')
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
await mkdir('artifacts/category-stories', { recursive: true })
try {
  const page = await browser.newPage()
  for (const width of [390, 768, 1440]) {
    await page.setViewport({ width, height: 900 })
    await page.goto(origin + '/category/care', { waitUntil: 'networkidle0' })
    await page.waitForSelector('#store-content .category-circle-link')
    assert.equal(await page.$$eval('.store-departments', nodes => nodes.length), 1)
    assert.equal(await page.$$eval('#shop article', nodes => nodes.length), 0)
    assert.equal(await page.$eval('.store-departments [aria-current=page] strong', node => node.textContent), 'العناية')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.evaluate(() => { window.qaHeader = document.querySelector('.shop-header'); window.qaDocument = 'category-navigation' })
    await page.click('#store-content .category-circle-link')
    await page.waitForFunction(() => document.querySelectorAll('#shop article').length === 2)
    const child = page.url()
    assert.equal(await page.$eval('.store-departments [aria-current=page] strong', node => node.textContent), 'العناية')
    assert.equal(await page.$('#home'), null)
    await page.click('.store-departments a:first-child')
    await page.waitForFunction(() => document.body.innerText.includes('لا توجد أقسام فرعية حاليًا'))
    assert.equal(await page.$$eval('#shop article', nodes => nodes.length), 0)
    await page.goBack({ waitUntil: 'networkidle0' })
    await page.waitForFunction(() => document.querySelectorAll('#shop article').length === 2)
    assert.equal(page.url(), child)
    assert.equal(await page.evaluate(() => window.qaHeader === document.querySelector('.shop-header') && window.qaDocument === 'category-navigation'), true)
    await page.goForward({ waitUntil: 'networkidle0' })
    await page.waitForFunction(() => document.body.innerText.includes('لا توجد أقسام فرعية حاليًا'))
    await page.goto(child, { waitUntil: 'networkidle0' })
    await page.reload({ waitUntil: 'networkidle0' })
    assert.equal(await page.$$eval('#shop article', nodes => nodes.length), 2)
    assert.equal(await page.$('#home'), null)
    await page.screenshot({ path: 'artifacts/category-stories/' + width + '.png' })
    for (const route of ['/', '/categories', '/favorites', '/cart', '/products/body-mist']) {
      await page.goto(origin + route, { waitUntil: 'networkidle0' })
      assert.equal(await page.$$eval('.store-departments', nodes => nodes.length), 1)
    }
    console.log('Category navigation passed at ' + width + 'px')
  }
} finally { await browser.close() }
