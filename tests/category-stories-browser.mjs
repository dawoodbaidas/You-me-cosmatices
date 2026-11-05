// Run against `npm run test:store-browser` with its printed isolated URL.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const origin = process.argv[2]
assert.ok(origin && new URL(origin).hostname === '127.0.0.1', 'Pass the isolated browser QA URL')
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ?? pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js').href)
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
await mkdir('artifacts/category-stories', { recursive: true })
try {
  const page = await browser.newPage()
  for (const width of [390, 768, 1440]) {
    await page.setViewport({ width, height: 900 })
    await page.goto(`${origin}/category/all`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.store-departments .category-orb img')
    assert.equal(await page.$$eval('.store-departments', nodes => nodes.length), 1)
    assert.equal(await page.$eval('.store-departments [aria-current=page]', node => node.textContent), 'الكل')
    const initialCount = await page.$eval('.collection-heading > span', node => parseInt(node.textContent))
    assert.ok(initialCount > 0)
    await page.evaluate(() => window.scrollTo(0, 160))
    const layout = await page.$eval('.store-departments', node => {
      const rect = node.getBoundingClientRect()
      const orb = node.querySelector('.category-orb').getBoundingClientRect()
      return { top: rect.top, height: rect.height, headerBottom: document.querySelector('.shop-header').getBoundingClientRect().bottom, direction: getComputedStyle(node).direction, orbWidth: orb.width, orbHeight: orb.height, background: getComputedStyle(node).backgroundColor, headerBackground: getComputedStyle(document.querySelector('.shop-header')).backgroundColor }
    })
    assert.ok(Math.abs(layout.top - layout.headerBottom) <= 1, JSON.stringify(layout))
    assert.ok(layout.height < 130)
    assert.equal(layout.direction, 'rtl')
    assert.equal(layout.orbWidth, layout.orbHeight)
    assert.equal(layout.background, layout.headerBackground)
    assert.ok(await page.$eval('.store-departments .category-circle-link', node => node.getBoundingClientRect().width) <= 92)
    await page.click('.store-departments a[href="/category/care"]')
    await page.waitForFunction(() => location.pathname === '/category/care' && document.querySelector('.store-departments [aria-current=page]')?.getAttribute('href') === '/category/care')
    assert.ok(await page.$eval('.collection-heading > span', node => parseInt(node.textContent)) < initialCount)
    assert.equal(await page.$eval('.store-departments [aria-current=page] .category-orb', node => getComputedStyle(node).outlineStyle), 'solid')
    // Constrain the short fixture row to exercise overflow on every viewport.
    await page.$eval('.store-departments .category-circle-grid', node => { node.style.maxWidth = '180px' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.click('.store-departments a[href="/category/empty"]')
    await page.waitForFunction(() => location.pathname === '/category/empty' && document.querySelector('.store-departments [aria-current=page]')?.getAttribute('href') === '/category/empty')
    await page.waitForFunction(() => {
      const active = document.querySelector('.store-departments [aria-current=page]').getBoundingClientRect()
      const row = document.querySelector('.store-departments .category-circle-grid').getBoundingClientRect()
      return active.left >= row.left - 1 && active.right <= row.right + 1
    })
    assert.equal(await page.$$eval('#shop article', nodes => nodes.length), 0)
    await page.goBack({ waitUntil: 'networkidle0' })
    await page.waitForFunction(() => document.querySelector('.store-departments [aria-current=page]')?.getAttribute('href') === '/category/care')
    await page.$eval('.store-departments .category-circle-grid', node => { node.style.maxWidth = '' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await new Promise(resolve => setTimeout(resolve, 700))
    await page.screenshot({ path: `artifacts/category-stories/${width}.png` })
    for (const route of ['/', '/categories', '/favorites', '/cart', '/products/body-mist']) {
      await page.goto(origin + route, { waitUntil: 'networkidle0' })
      assert.equal(await page.$eval('#store-content', node => getComputedStyle(node).backgroundColor), layout.background)
    }
    console.log(`Category stories passed at ${width}px`)
  }
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(`${origin}/category/all`, { waitUntil: 'networkidle0' })
  assert.equal(await page.$eval('.store-departments .category-circle-grid', node => getComputedStyle(node).scrollBehavior), 'auto')
} finally {
  await browser.close()
}
