// Navigation-flash regression check against a production build of the real
// app with an isolated database; never reads .env.
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { createServer } from 'node:net'
import assert from 'node:assert/strict'
import { startStoreBrowserDatabase } from './helpers/store-browser-server.mjs'
import { createBrowserWorkspace, removeBrowserWorkspace, browserTestEnvironment } from './helpers/browser-workspace.mjs'

const production = process.argv[2] !== 'dev'
const project = resolve(import.meta.dirname, '..')
const db = await startStoreBrowserDatabase()
const directory = await createBrowserWorkspace(project)
const env = { ...browserTestEnvironment(db.url), NODE_ENV: production ? 'production' : 'development' }
const next = resolve(project, 'node_modules/next/dist/bin/next')
if (production) {
  const build = spawn(process.execPath, [next, 'build', '--webpack'], { cwd: directory, env, stdio: 'inherit', windowsHide: true })
  if ((await once(build, 'exit'))[0]) throw new Error('Production build failed')
}
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const server = spawn(process.execPath, [next, production ? 'start' : 'dev', '-p', String(port)], { cwd: directory, env, stdio: 'inherit', windowsHide: true })
const origin = `http://localhost:${port}`
let browser
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  const { chromium } = await import('playwright')
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const assertNoHomepageVisual = async () => assert.equal(await page.locator('[data-wordmark]').count(), 0, 'homepage hero must not be visible')

  // 1. Homepage → الأقسام: skeleton (never the frozen homepage) then content.
  await page.goto(`${origin}/`, { timeout: 180000 })
  await page.locator('[data-wordmark]').first().waitFor()
  await page.waitForTimeout(1200)
  await page.locator('.world-desktop-nav a[href="/categories"]').click()
  await page.waitForFunction(() => location.pathname === '/categories' &&
    (document.querySelector('.category-skeleton') || document.querySelector('.category-circles section h2, .category-circles h2') || document.querySelector('#shop')))
  await assertNoHomepageVisual()
  assert.equal(await page.locator('.loadingHeader').count(), 0, 'must not show duplicate fake header skeleton')
  await page.locator('.category-circles').first().waitFor()
  assert.equal(await page.locator('.world-header').count(), 1, 'single header only')
  await page.screenshot({ path: 'test-results/nav-flash-categories.png' })

  // 2. Homepage → رجالي / نسائي through header mega menu (category circles links).
  await page.locator('.world-desktop-nav .mega-anchor button').click()
  await page.locator('#shop-mega').waitFor()
  const megaLinks = page.locator('#shop-mega a:not([href="#"])')
  const firstMegaHref = await megaLinks.first().getAttribute('href')
  assert.ok(firstMegaHref?.startsWith('/categories/') || firstMegaHref?.startsWith('/category/'), `mega link href: ${firstMegaHref}`)
  await page.locator('#shop-mega a').first().click()
  await page.waitForURL(`**${firstMegaHref}`)
  await page.waitForFunction(() => !document.querySelector('.category-skeleton'))
  await assertNoHomepageVisual()
  const departmentCircles = await page.locator('.category-circles .category-circle-link').count()
  console.log(`department ${firstMegaHref}: circles=${departmentCircles} products-grid=${await page.locator('#shop article').count()}`)

  // 3. Main category → subcategory circle → its products.
  const subLink = page.locator('.category-circles .category-circle-link:not([aria-current="page"])').first()
  const subHref = await subLink.getAttribute('href')
  await subLink.click()
  await page.waitForURL(`**${subHref}`)
  await page.waitForFunction(() => !document.querySelector('.category-skeleton'))
  await assertNoHomepageVisual()

  // 4. Subcategory → main category, plus Category A → Category B via circles.
  const backHref = firstMegaHref
  await page.locator(`.category-circles .category-circle-link[href="${backHref}"]`).first().click()
  await page.waitForURL(`**${backHref}`)
  const otherHref = await page.locator('.category-circles .category-circle-link:not([aria-current="page"])').first().getAttribute('href')
  if (otherHref !== backHref) {
    await page.locator(`.category-circles .category-circle-link[href="${otherHref}"]`).first().click()
    await page.waitForURL(`**${otherHref}`)
    await assertNoHomepageVisual()
  }

  // 5. Browser back/forward keep correct content, no homepage flash.
  await page.goBack()
  await page.waitForURL(`**${backHref}`)
  await page.waitForFunction(() => !document.querySelector('.category-skeleton'))
  await page.goBack()
  await page.waitForURL(`**${subHref}`)
  await page.waitForFunction(() => !document.querySelector('.category-skeleton'))
  await assertNoHomepageVisual()
  await page.goForward()
  await page.waitForURL(`**${backHref}`)
  await page.goForward()
  await page.waitForURL(u => u.pathname.replace(/\/$/, '') === otherHref.replace(/\/$/, ''))

  // 6. Direct URL open + refresh: correct data, single header, no hero.
  for (const target of [otherHref, '/categories']) {
    await page.goto(`${origin}${target}`, { timeout: 180000 })
    await page.waitForFunction(() => !document.querySelector('.category-skeleton'))
    assert.equal(await page.locator('.world-header').count(), 1)
    await assertNoHomepageVisual()
    await page.reload()
    await page.waitForFunction(() => !document.querySelector('.category-skeleton'))
    await assertNoHomepageVisual()
  }

  // 7. Pending navigation must not keep previous category's products.
  const context2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const mobile = await context2.newPage()

  await mobile.goto(`${origin}/category/perfumes`, { timeout: 180000 })
  await mobile.locator('.category-circles').first().waitFor({ state: 'attached' })
  const pendingHref = '/category/all?q=nav-flash-test'
  await mobile.route(`**${pendingHref}*`, async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue() })
  await mobile.locator('.nav-search').click()
  await mobile.locator('[data-dialog-autofocus]').fill('nav-flash-test')
  await mobile.locator('.overlay-search-form button[type="submit"]').click()
  await mobile.waitForTimeout(400)
  assert.equal(await mobile.locator('.category-skeleton').count(), 1, 'mobile: category skeleton during slow navigation')
  assert.equal(await mobile.locator('#shop article').count(), 0, 'mobile: previous products must not stay visible')
  await mobile.waitForURL(`**${encodeURIComponent('nav-flash-test')}*`)
  await assertNoHomepageVisual()
  await context2.close()

  console.log(`NAV-FLASH CHECK PASSED (${production ? 'production' : 'dev'} build)`)
} finally {
  await browser?.close()
  server.kill('SIGTERM')
  await db.close()
  try { await removeBrowserWorkspace(directory) } catch { console.log(`QA workspace retained: ${directory}`) }
}
