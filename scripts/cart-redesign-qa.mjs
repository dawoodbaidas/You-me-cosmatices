import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const origin = process.env.CART_QA_ORIGIN || 'http://127.0.0.1:12856'
const database = process.env.CART_QA_DATABASE || 'http://127.0.0.1:12855'
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
await mkdir('artifacts/cart-redesign', { recursive: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(String(error)))
  const catalogue = await fetch(`${database}/rest/v1/products`).then(r => r.json())
  const product = catalogue.find(p => p.product_variants.length > 1)
  const items = product.product_variants.slice(0, 2).map(v => ({ productId: product.id, variantId: v.id, quantity: 1 }))
  await page.goto(`${origin}/cart`, { waitUntil: 'networkidle0' })
  await page.evaluate(items => localStorage.setItem('you-and-me-cart-v1', JSON.stringify(items)), items)
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="cart-items"]')
  await page.$eval('[data-testid="cart-items"] h3', el => { el.textContent = el.textContent.repeat(5) })
  for (const width of [320, 360, 375, 430, 768, 1024, 1440]) {
    await page.setViewport({ width, height: 900 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`)
    assert.ok(await page.$eval('[data-testid="cart-items"]', el => [...el.querySelectorAll('button')].every(b => b.clientWidth >= 44 && b.clientHeight >= 44)))
    assert.ok(await page.$eval('.mobile-shopping-bar', el => el.getAttribute('aria-hidden') === 'true'))
    assert.ok(await page.$eval('[data-testid="cart-items"] li', el => { const image = el.querySelector('img'); return image && image.getBoundingClientRect().right > el.querySelector('h3').getBoundingClientRect().right }))
    await page.screenshot({ path: `artifacts/cart-redesign/cart-${width}.png`, fullPage: true })
    console.log('PASS layout', width)
  }
  const quantity = () => page.evaluate(() => JSON.parse(localStorage.getItem('you-and-me-cart-v1'))[0].quantity)
  await page.click('[data-testid="cart-items"] button[aria-label^="زيادة"]')
  assert.equal(await quantity(), 2)
  await page.click('[data-testid="cart-items"] button[aria-label^="خفض"]')
  assert.equal(await quantity(), 1)
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await quantity(), 1)
  await page.evaluate(items => {
    localStorage.setItem('you-and-me-cart-v1', JSON.stringify(items.map((item, index) => ({ ...item, quantity: index === 0 ? 99 : 1 }))))
  }, items)
  await page.reload({ waitUntil: 'networkidle0' })
  assert.ok(await page.$eval('[aria-busy]', el => el.disabled))
  assert.ok(await page.$eval('[data-testid="cart-items"] [role="status"]', el => el.textContent.length > 0))
  await page.evaluate(items => localStorage.setItem('you-and-me-cart-v1', JSON.stringify(items)), items)
  await page.reload({ waitUntil: 'networkidle0' })
  await page.click('[data-testid="cart-items"] button[aria-label^="حذف"]')
  assert.equal(await page.$$eval('[data-testid="cart-items"] li', els => els.length), 1)
  await page.click('[data-testid="cart-items"] button[aria-label^="حذف"]')
  await page.waitForSelector('[data-testid="cart-empty"]')
  assert.deepEqual(errors, [])
  console.log('PASS variants, quantity, removal, persistence, empty state; no page errors')
} finally { await browser.close() }
