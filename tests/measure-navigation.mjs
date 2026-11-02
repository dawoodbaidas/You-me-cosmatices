// Production browser measurements against an isolated database; never reads .env.
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import assert from 'node:assert/strict'
import { startStoreBrowserDatabase } from './helpers/store-browser-server.mjs'
import { createBrowserWorkspace, browserTestEnvironment } from './helpers/browser-workspace.mjs'

const project = resolve(import.meta.dirname, '..')
const label = process.argv[2] ?? 'after'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const db = await startStoreBrowserDatabase()
const directory = await createBrowserWorkspace(project)
const env = { ...browserTestEnvironment(db.url), NODE_ENV: 'production' }
const next = resolve(project, 'node_modules/next/dist/bin/next')
const build = spawn(process.execPath, [next, 'build', '--webpack'], { cwd: directory, env, stdio: 'inherit', windowsHide: true })
if ((await once(build, 'exit'))[0]) throw new Error('Production build failed')
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const server = spawn(process.execPath, [next, 'start', '-p', String(port)], { cwd: directory, env, stdio: 'inherit', windowsHide: true })
const origin = `http://localhost:${port}`
let browser
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const results = []
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile })
    const page = await context.newPage()
    let documents = 0
    page.on('request', request => { if (request.resourceType() === 'document') documents++ })
    await page.goto(`${origin}/category/all`)
    await page.locator('.collection-heading h1').waitFor()
    await page.waitForTimeout(1500)
    await page.evaluate(() => { window.__navigationMarker = 'retained' })
    const timings = []
    for (const slug of ['perfumes', 'care', 'all', 'perfumes', 'care', 'all']) {
      const link = page.locator(`.category-departments a[href="/category/${slug}"]`).first()
      const start = await page.evaluate(() => performance.now())
      await link.click()
      await page.waitForFunction(slug => location.pathname === `/category/${slug}` && document.querySelector('.collection-heading h1') && !document.querySelector('#shop [aria-busy="true"]'), slug)
      timings.push({ slug, ms: Math.round(await page.evaluate(() => performance.now()) - start) })
    }
    const detailStart = await page.evaluate(() => performance.now())
    await page.locator('#shop article button').first().click()
    await page.locator('[data-testid="product-quickview"]').waitFor({ state: 'visible' })
    await page.waitForFunction(() => {
      const image = document.querySelector('.quickview-media img')
      return image ? image.complete && image.naturalWidth > 0 : Boolean(document.querySelector('.quickview-media .product-image-fallback'))
    })
    const detailMs = Math.round(await page.evaluate(() => performance.now()) - detailStart)
    await page.screenshot({ path: `test-results/store-design-details-${mobile ? 'mobile' : 'desktop'}.png` })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await page.locator('#shop article').first().locator('button').last().click()
    await page.locator('.category-departments a[href="/category/care"]').click()
    await page.waitForURL('**/category/care')
    await page.locator('.header-bag').click()
    await page.locator('[data-testid="cart-drawer"]').waitFor({ state: 'visible' })
    await page.waitForTimeout(250)
    const cartBounds = await page.locator('[data-testid="cart-drawer"]').evaluate(element => {
      const { left, right, bottom } = element.getBoundingClientRect()
      return { left: Math.round(left), right: Math.round(right), bottom: Math.round(bottom), viewport: innerWidth }
    })
    assert.ok(cartBounds.left >= -1 && cartBounds.right <= cartBounds.viewport + 1, `Cart drawer fits viewport: ${JSON.stringify(cartBounds)}`)
    await page.screenshot({ path: `test-results/store-design-cart-${mobile ? 'mobile' : 'desktop'}.png` })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.goBack()
    await page.waitForURL('**/category/all')
    await page.waitForTimeout(400)
    const retained = await page.evaluate(() => window.__navigationMarker === 'retained')
    const cart = await page.locator('.header-bag > span').textContent()
    const brand = await page.locator('.store-brand').first().textContent()
    const logoImages = await page.locator('.store-brand img').count()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(150)
    await page.screenshot({ path: `test-results/navigation-${label}-${mobile ? 'mobile' : 'desktop'}.png` })
    await page.screenshot({ path: `test-results/store-design-${mobile ? 'mobile' : 'desktop'}.png` })
    const unfilteredCount = await page.locator('.collection-heading > span').textContent()
    await page.locator('.filter-open').click()
    await page.locator('.shop-filter-sheet[open]').waitFor()
    await page.screenshot({ path: `test-results/store-design-filters-${mobile ? 'mobile' : 'desktop'}.png` })
    await page.locator('.shop-filter-sheet > label').nth(1).locator('input').check()
    await page.waitForFunction(count => document.querySelector('.collection-heading > span')?.textContent !== count, unfilteredCount)
    await page.locator('.filter-sheet-actions button').last().click()
    await page.locator('.shop-filter-sheet[open]').waitFor({ state: 'detached' })
    await page.locator('.filter-open').click()
    await page.locator('.shop-filter-sheet[open]').waitFor()
    await page.locator('.filter-sheet-actions button').first().click()
    await page.locator('.filter-sheet-actions button').last().click()
    await page.locator('.shop-filter-sheet[open]').waitFor({ state: 'detached' })
    assert.equal(retained, true)
    assert.equal(documents, 1)
    assert.equal(cart, '1')
    let menuLogo = null
    if (label !== 'before') {
      assert.equal(brand?.trim(), 'You&Me')
      assert.equal(logoImages, 0, 'Do not display the unsuitable square logo with a second text label')
      if (mobile) {
        await page.locator('.menu-trigger').click()
        const menuBrand = page.locator('.shopping-menu-head .store-brand')
        await menuBrand.waitFor({ state: 'visible' })
        menuLogo = await menuBrand.textContent()
        assert.equal(menuLogo?.trim(), 'You&Me')
        await page.screenshot({ path: `test-results/navigation-${label}-menu.png` })
        await page.keyboard.press('Escape')
      }
    }
    const homeStart = await page.evaluate(() => performance.now())
    await page.locator('.shop-breadcrumb a[href="/"]').click()
    await page.waitForFunction(() => location.pathname === '/' && document.querySelector('#home'))
    const homeMs = Math.round(await page.evaluate(() => performance.now()) - homeStart)
    const heroWordmark = await page.locator('[data-wordmark]').textContent()
    assert.equal(heroWordmark?.trim(), 'YOU&ME')
    assert.ok(await page.locator('[data-hero-product]').count() > 0)
    await page.waitForTimeout(1800)
    await page.screenshot({ path: `test-results/navigation-${label}-hero-${mobile ? 'mobile' : 'desktop'}.png` })
    results.push({ device: mobile ? 'mobile' : 'desktop', timings, detailMs, homeMs, documents, retained, cart, brand, logoImages, menuLogo, heroWordmark })
    await context.close()
  }
  if (label !== 'before') {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    let release
    const held = new Promise(resolve => { release = resolve })
    await page.route('**/category/empty*', async route => { await held; await route.continue() })
    await page.goto(`${origin}/category/all`)
    await page.locator('.collection-heading h1').waitFor()
    await page.locator('.category-departments a[href="/category/empty"]').click()
    await page.locator('[aria-busy="true"]').first().waitFor()
    assert.equal(await page.locator('#shop article').count(), 0, 'Pending category must not show previous products')
    release()
    await page.waitForURL('**/category/empty')
    await page.locator('.empty-collection').waitFor()
    await page.goto(`${origin}/category/perfumes`)
    const product = page.locator('[data-testid="product-body-mist"]')
    await product.waitFor()
    await fetch(`${db.url}/__test/edit`, { method: 'POST' })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForFunction(() => document.querySelector('[data-testid="product-body-mist"] button:disabled'))
    assert.equal(await page.locator('.store-brand').first().textContent().then(text => text.trim()), 'You&Me')
    await page.locator('.footer-brand').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/navigation-${label}-footer.png` })
    results.push({ checks: 'cold-category skeleton hides old products; empty category; database stock edit refreshes cached page; English footer wordmark', passed: true })
    await context.close()
  }
  const stats = await (await fetch(`${db.url}/__test/stats`)).json()
  const result = { label, mode: 'production, isolated local database', results, stats }
  await writeFile(resolve(project, `test-results/navigation-${label}.json`), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser?.close()
  server.kill()
  await db.close()
  console.log(`Isolated measurement workspace retained: ${directory}`)
}
