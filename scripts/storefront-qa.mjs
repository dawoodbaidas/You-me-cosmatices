import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { default: puppeteer } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'puppeteer-core')
const url = process.argv[3] || 'http://localhost:3010'
const browser = await puppeteer.launch({ executablePath: process.argv[4] || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const output = 'artifacts/redesign'
await mkdir(output, { recursive: true })
const report = { widths: [], checks: [], errors: [], source: '', productCount: 0 }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
  const page = await browser.newPage()
  page.on('pageerror', error => report.errors.push(error.message))
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForSelector('.beauty-card')
  report.source = await page.evaluate(() => document.body.innerText.includes('وضع المعاينة المحلية') ? 'existing preview snapshot' : 'Supabase')
  const count = await page.$$eval('.beauty-card', cards => cards.length)
  report.productCount = count
  assert.ok(count > 0)
  assert.equal(await page.$eval('.boutique', el => getComputedStyle(el).getPropertyValue('--wine').trim()), '#702b3c')
  report.checks.push('catalog loaded; scoped design tokens applied')

  for (const width of [360, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewport({ width, height: width >= 768 ? 1000 : 844, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 })
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await pause(1300)
    await page.screenshot({ path: `${output}/home-${width}.png` })
    for (const section of ['discover', 'shop', 'story', 'contact']) {
      await page.evaluate(id => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), section)
      await pause(200)
      const sizes = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, root: document.documentElement.scrollWidth }))
      assert.ok(sizes.body <= width + 1 && sizes.root <= width + 1, `overflow ${width} / ${section}: ${JSON.stringify(sizes)}`)
    }
    await page.evaluate(() => document.getElementById('shop').scrollIntoView({ behavior: 'instant' }))
    await pause(500)
    await page.screenshot({ path: `${output}/shop-${width}.png` })
    if ([390, 1440].includes(width)) {
      await page.evaluate(() => document.querySelector('.editorial').scrollIntoView({ behavior: 'instant' }))
      await pause(400)
      await page.screenshot({ path: `${output}/editorial-${width}.png` })
      for (const id of ['discover', 'story', 'contact']) {
        await page.evaluate(section => document.getElementById(section).scrollIntoView({ behavior: 'instant' }), id)
        await pause(400)
        await page.screenshot({ path: `${output}/${id}-${width}.png` })
      }
    }
    report.widths.push(width)
  }
  report.checks.push('seven responsive widths; no horizontal page overflow while scrolling; home/shop/editorial screenshots')
  const brokenImages = await page.$$eval('.beauty-card img', async images => {
    await Promise.all(images.map(image => { image.loading = 'eager'; return image.decode().catch(() => {}) }))
    return images.filter(image => !image.naturalWidth).map(image => image.alt)
  })
  assert.deepEqual(brokenImages, [], 'catalog image requests failed')
  report.checks.push('all catalog image URLs decoded successfully; products without images retain placeholders')
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.evaluate(() => document.getElementById('shop').scrollIntoView({ behavior: 'instant' }))
  const filterScroll = await page.evaluate(() => scrollY)
  const filters = await page.$$eval('.category-tabs button', buttons => buttons.map(button => button.dataset.testid))
  for (const filter of filters) {
    await page.$eval(`[data-testid="${filter}"]`, button => button.click())
    await pause(100)
    assert.equal(await page.$eval(`[data-testid="${filter}"]`, button => button.getAttribute('aria-pressed')), 'true')
    const ids = await page.$$eval('.beauty-card', cards => cards.map(card => card.dataset.testid))
    assert.equal(ids.length, new Set(ids).size)
    assert.ok(ids.length <= count)
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - filterScroll) < 5, `filter ${filter} moved the page`)
  }
  await page.$eval('[data-testid="filter-all"]', button => button.click())
  await pause(100)
  assert.equal(await page.$$eval('.beauty-card', cards => cards.length), count)
  report.checks.push('all eight filters; unique product IDs; all restores complete catalog')

  // Use a real rendered variant and its displayed price, never a hardcoded catalog substitute.
  const product = await page.$eval('.beauty-card:has(select)', card => {
    const select = card.querySelector('select')
    const option = select.options[select.options.length - 1]
    return { testid: card.dataset.testid, variantId: option.value, optionText: option.text, name: card.querySelector('h3').innerText }
  })
  await page.select(`[data-testid="${product.testid}"] select`, product.variantId)
  const unit = await page.$eval(`[data-testid="${product.testid}"] .product-price strong`, el => parseFloat(el.textContent))
  await page.$eval(`[data-testid="${product.testid}"] .product-image-button`, button => button.click())
  await page.waitForSelector('.quickview-dialog[open]')
  await pause(500)
  await page.screenshot({ path: `${output}/quickview-390.png` })
  assert.ok((await page.$eval('.quickview-sheet [aria-pressed="true"]', button => button.textContent)).includes(product.optionText.split(' — ')[0]))
  await page.keyboard.press('Escape')
  await page.$eval(`[data-testid="${product.testid}"] .product-add`, button => button.click())
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('you-and-me-cart-v1') || '[]').length > 0)
  await page.click('.header-bag')
  await page.waitForSelector('.cart-dialog[open]')
  await page.$$eval('.cart-sheet li button', buttons => buttons.find(button => button.getAttribute('aria-label') === 'زيادة الكمية').click())
  await pause(100)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('you-and-me-cart-v1')))
  assert.equal(stored[0].variantId, product.variantId)
  assert.equal(stored[0].quantity, 2)
  assert.ok((await page.$eval('.cart-sheet', el => el.innerText)).includes((unit * 2).toFixed(2)))
  await page.evaluate(() => { window.open = href => { window.__checkoutUrl = href; return null } })
  await page.$eval('.cart-sheet .bg-whatsapp', button => button.click())
  const checkout = await page.evaluate(() => window.__checkoutUrl)
  assert.ok(checkout.startsWith('https://wa.me/'))
  const message = new URL(checkout).searchParams.get('text')
  assert.ok(message.includes(product.name))
  assert.ok(message.includes(product.optionText.split(' — ')[0]))
  assert.ok(message.includes((unit * 2).toFixed(2)))
  await pause(500)
  await page.screenshot({ path: `${output}/cart-390.png` })
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.screenshot({ path: `${output}/cart-1440.png` })
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.querySelector('.cart-dialog').contains(document.activeElement)), true)
  }
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('header-bag')), true)
  await page.reload({ waitUntil: 'networkidle0' })
  await page.click('.header-bag')
  await page.waitForSelector('.cart-dialog[open]')
  assert.ok((await page.$eval('.cart-sheet', el => el.innerText)).includes((unit * 2).toFixed(2)))
  await page.$$eval('.cart-sheet li button', buttons => buttons.find(button => button.getAttribute('aria-label') === 'إنقاص الكمية').click())
  await pause(100)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('you-and-me-cart-v1'))[0].quantity), 1)
  await page.$$eval('.cart-sheet li button', buttons => buttons.find(button => button.getAttribute('aria-label') === 'حذف المنتج').click())
  await pause(100)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('you-and-me-cart-v1')).length), 0)
  await page.keyboard.press('Escape')
  report.checks.push('variant selection shared with quick view; add/increment/decrement/remove; accurate totals; persistence; WhatsApp URL/message intercepted without sending; dialog focus trap and restoration')

  await page.$eval('.menu-toggle', button => button.click())
  await page.waitForSelector('.menu-dialog[open]')
  await pause(500)
  await page.screenshot({ path: `${output}/menu-390.png` })
  await page.keyboard.press('Escape')
  assert.equal(await page.$('.menu-dialog[open]'), null)
  await page.evaluate(() => document.getElementById('discover').scrollIntoView({ behavior: 'instant' }))
  const before = await page.$eval('.collection-ribbon', el => el.scrollLeft)
  await page.$eval('.collection-ribbon', el => el.scrollBy({ left: -240, behavior: 'instant' }))
  await pause(200)
  assert.notEqual(await page.$eval('.collection-ribbon', el => el.scrollLeft), before)
  const cdp = await page.createCDPSession()
  const scrollBefore = await page.evaluate(() => scrollY)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 650 }] })
  for (let y = 600; y >= 200; y -= 50) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y }] })
    await pause(30)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await pause(300)
  assert.ok(await page.evaluate(previous => scrollY > previous, scrollBefore))
  await cdp.detach()
  report.checks.push('mobile navigation; RTL horizontal ribbon; native touch scrolling')

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  assert.equal(await page.$eval('.headline-mask > span', el => getComputedStyle(el).animationName), 'none')
  assert.equal(await page.$eval('.editorial-photo', el => getComputedStyle(el).animationName), 'none')
  await page.screenshot({ path: `${output}/reduced-motion-390.png` })
  report.checks.push('reduced motion disables entrance and scroll animations')
  const admin = await browser.newPage()
  await admin.goto(url + '/admin', { waitUntil: 'networkidle0', timeout: 60000 })
  assert.ok(admin.url().includes('/admin/login'))
  assert.equal(await admin.$('.boutique'), null)
  await admin.close()
  report.checks.push('unauthenticated admin remains protected and outside storefront styling')
  assert.deepEqual(report.errors, [])
  await writeFile(`${output}/qa-report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}

