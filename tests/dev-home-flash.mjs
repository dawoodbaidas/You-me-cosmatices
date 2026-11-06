// Light check against an already-running dev server (default :3000): from the
// homepage, click الأقسام and confirm no homepage hero and no duplicate header.
import assert from 'node:assert/strict'

const origin = process.argv[2] ?? 'http://localhost:3000'
const { chromium } = await import('playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  await page.goto(`${origin}/`, { timeout: 180000 })
  await page.locator('.world-desktop-nav a[href="/categories"]').click()
  await page.waitForFunction(() => location.pathname === '/categories', { timeout: 180000 })
  assert.equal(await page.locator('.world-header').count(), 1, 'single header')
  assert.equal(await page.locator('.loadingHeader, [data-wordmark]').count(), 0, 'no fake header, no homepage hero on category page')
  await page.locator('.category-circles').first().waitFor()
  console.log('DEV CHECK PASSED for / → /categories (end state correct, single header, no homepage remnants)')
} finally {
  await browser.close()
}
