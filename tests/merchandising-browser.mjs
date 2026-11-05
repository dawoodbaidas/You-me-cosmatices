// Pass the two loopback URLs printed by npm run test:store-browser.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const [origin, database] = process.argv.slice(2)
assert.ok([origin, database].every(url => new URL(url).hostname === '127.0.0.1'))
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ?? pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js').href)
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const change = async payload => {
  const response = await fetch(database + '/__test/merchandising', { method: 'POST', body: JSON.stringify(payload) })
  assert.equal(response.status, 200, await response.text())
}
await mkdir('artifacts/merchandising', { recursive: true })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  for (const [isNew, discountEnabled] of [[false, false], [true, false], [false, true], [true, true]]) {
    await change({ slug: 'body-mist', originalPrice: 10, price: discountEnabled ? 8 : 10, discountEnabled, isNew })
    await page.goto(origin + '/category/perfumes', { waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-testid="product-body-mist"]')
    const badges = await page.$eval('[data-testid="product-body-mist"]', card => ({ top: card.querySelector('[class*="badge"]')?.textContent ?? null, bottom: card.querySelector('[class*="newBadge"]')?.textContent ?? null, old: card.querySelector('[data-price-tag] del')?.textContent ?? null }))
    assert.equal(badges.top, discountEnabled ? '-20%' : isNew ? 'جديد' : null)
    assert.equal(badges.bottom, isNew && discountEnabled ? 'جديد' : null)
    assert.equal(badges.old !== null, discountEnabled)
  }
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  for (const width of [390, 1440]) {
    await page.setViewport({ width, height: 900 })
    await page.$eval('[data-testid="product-body-mist"]', node => node.scrollIntoView({ block: 'center' }))
    await page.screenshot({ path: `artifacts/merchandising/badges-${width}.png` })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  await page.click('[data-testid="product-body-mist"] [data-price-tag]')
  await page.goto(origin + '/cart', { waitUntil: 'networkidle0' })
  assert.ok(await page.$('del'))
  const before = await page.$eval('[data-testid="cart-line-body-mist"]', node => node.textContent)
  await change({ slug: 'body-mist', originalPrice: 10, price: 10, discountEnabled: false, isNew: false })
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await page.$('del'), null)
  assert.notEqual(await page.$eval('[data-testid="cart-line-body-mist"]', node => node.textContent), before)
  let confirmation = ''
  page.on('dialog', async dialog => { confirmation = dialog.message(); await dialog.accept() })
  // Exercise checkout without navigating to or sending anything through WhatsApp.
  await page.evaluate(() => { window.open = () => ({ opener: null, close() {}, location: { replace(url) { window.__checkoutUrl = url } } }) })
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('إتمام الطلب عبر واتساب')).click())
  await page.waitForFunction(() => window.__checkoutUrl)
  assert.ok(confirmation.includes('تغيّرت الأسعار'))
  const checkoutUrl = await page.evaluate(() => window.__checkoutUrl)
  assert.ok(new URL(checkoutUrl).searchParams.get('text').includes('رقم الطلب:'))
  assert.equal((await (await fetch(database + '/__test/stats')).json()).orders, 1)
  await change({ section: 'hero', slugs: ['mascara', 'body-mist'] })
  await change({ section: 'bestsellers', slugs: ['body-mist', 'foundation'] })
  await page.goto(origin, { waitUntil: 'networkidle0' })
  const labels = await page.$$eval('#home [data-hero-product]', nodes => nodes.map(node => node.getAttribute('aria-label')))
  assert.equal(labels.length, 2)
  assert.ok(labels[0].includes('ماسكارا'))
  await page.reload({ waitUntil: 'networkidle0' })
  assert.deepEqual(await page.$$eval('#home [data-hero-product]', nodes => nodes.map(node => node.getAttribute('aria-label'))), labels)
  await change({ section: 'hero', slugs: [] })
  await change({ section: 'bestsellers', slugs: [] })
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await page.$('#home'), null)
  assert.equal(await page.$('#bestsellers'), null)
  console.log('Browser passed: all badge states, hanging tags, cart repricing and confirmation, saved order, ordered lists after reload, empty sections; 390/1440px.')
} finally { await browser.close() }
