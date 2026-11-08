import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { launchBrowser, poll, pause } from './helpers/cdp-browser.mjs'

const browser = await launchBrowser()
const report = []
await mkdir('artifacts/logo', { recursive: true })
try {
  for (const width of [390, 1440]) {
    const page = await browser.page(width)
    await page.navigate('http://localhost:3000/')
    await poll(() => page.evaluate(`!!document.querySelector('[data-hero-product]')`))
    const slug = await page.evaluate(`document.querySelector('[data-product-slug]').dataset.productSlug`)
    for (const path of ['/', '/categories', '/favorites', '/cart', '/products/' + slug, '/admin/login']) {
      await page.navigate('http://localhost:3000' + path)
      await page.evaluate(`window.scrollTo({top:document.body.scrollHeight,behavior:'instant'})`)
      await pause(300)
      await poll(() => page.evaluate(`Array.from(document.querySelectorAll('img[alt="YOU & ME Cosmetics"]')).filter(e=>e.getBoundingClientRect().width).every(e=>e.complete&&e.naturalWidth>0)`))
      const logos = await page.evaluate(`Array.from(document.querySelectorAll('img[alt="YOU & ME Cosmetics"]')).filter(e=>e.getBoundingClientRect().width).map(e=>({src:e.getAttribute('src'),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,fit:getComputedStyle(e).objectFit}))`)
      assert.ok(logos.length > 0, path)
      for (const logo of logos) {
        assert.ok(logo.width > 0 && logo.height > 0, JSON.stringify(logo))
        assert.equal(logo.fit, 'contain')
        assert.ok(logo.src.includes('logo-circular.') && logo.src.includes('_next'), 'hashed logo source')
      }
      assert.equal(await page.evaluate(`!!document.querySelector('link[rel="icon"][href*="icon-142d49152553"]')`), true)
      report.push({ width, path, logos })
      if (path === '/') {
        await page.screenshot(`artifacts/logo/footer-${width}.png`)
        await page.evaluate(`window.scrollTo({top:0,behavior:'instant'})`)
        await pause(200)
        await page.screenshot(`artifacts/logo/header-${width}.png`)
        await page.click('.menu-trigger')
        await poll(() => page.evaluate(`!!document.querySelector('.menu-dialog[open] img[alt="YOU & ME Cosmetics"]')`))
        await page.click('.shopping-menu-head button')
      }
    }
    await page.close()
  }
  console.log(`PASS: logo proportions and metadata across ${report.length} desktop/mobile page checks, including menus.`)
} finally {
  await writeFile('artifacts/logo/results.json', JSON.stringify(report, null, 2))
  await browser.close()
}
