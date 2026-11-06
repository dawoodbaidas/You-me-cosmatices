import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch({channel:'chrome',headless:true})
await mkdir('artifacts/product-presentation',{recursive:true})
try {
for (const [width,height] of [[360,800],[390,844],[430,932],[768,1024],[1280,900],[1440,900]]) {
const page = await browser.newPage({viewport:{width,height}})
await page.goto('http://localhost:3011/category/all',{waitUntil:'networkidle'})
const cards = page.locator('article[data-testid^="product-"]')
assert.ok(await cards.count()>0,'real catalogue loaded')
for (let i=0;i<Math.min(5,await cards.count());i++) {
const card=cards.nth(i)
await card.scrollIntoViewIfNeeded()
await card.locator('img').first().waitFor()
assert.equal(await card.locator('img').first().evaluate(el=>getComputedStyle(el).objectFit),'contain')
await card.locator('h3 a').click()
const dialog=page.locator('.quickview-dialog[open]')
await dialog.waitFor(); await page.waitForTimeout(250)
assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden')
assert.ok(await dialog.locator('img').evaluate(el=>el.complete && el.naturalWidth>0),'image loaded')
assert.ok(await dialog.locator('.quickview-sheet').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1),'sheet fits viewport')
await dialog.locator('.quickview-body').evaluate(el=>el.scrollTop=el.scrollHeight)
await page.screenshot({path:`artifacts/product-presentation/${width}-${i}.png`})
await dialog.locator('.quickview-close').click()
}
console.log(`${width}x${height}: five real products checked`)
await page.close()
}
} finally {await browser.close()}

