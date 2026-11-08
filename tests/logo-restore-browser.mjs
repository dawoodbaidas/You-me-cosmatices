import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { launchBrowser, poll, pause } from './helpers/cdp-browser.mjs'

const browser = await launchBrowser()
const report = []
await mkdir('artifacts/logo-restore', { recursive: true })
try {
  for (const width of [390, 1440]) {
    const page = await browser.page(width)
    await page.navigate('http://localhost:3000/')
    await poll(() => page.evaluate(`document.querySelector('[data-hero-product]')?.inert===false`), 60000)
    await pause(2500)
    // Baseline uses the exact original wordmark markup and typography retained
    // for sizing. Removing only the artwork overlay exposes that original UI.
    await page.evaluate(`window.measureLayout=()=>Array.from(document.querySelectorAll('.world-header,.world-header>*,#home,#home [data-scene-pin],#home h1,#home [data-hero-product],#home [data-hero-copy],footer,footer *')).filter(el=>el.tagName!=='IMG').map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})`)
    const restored = await page.evaluate(`measureLayout()`)
    await page.screenshot(`artifacts/logo-restore/restored-${width}.png`)
    await page.evaluate(`(()=>{const style=document.createElement('style');style.id='original-logo-baseline';style.textContent='[class*="StoreBrand-module"] { visibility:visible!important; } [class*="StoreBrand-module"][class*="brand"] { position:static!important; } img[alt="YOU & ME Cosmetics"] { display:none!important; } footer [class*="wordmark"] { position:static!important; } footer [class*="wordmark"] strong,footer [class*="wordmark"] span { visibility:visible!important; }';document.head.append(style)})()`)
    await pause(100)
    const baseline = await page.evaluate(`measureLayout()`)
    await page.screenshot(`artifacts/logo-restore/baseline-${width}.png`)
    assert.equal(restored.length, baseline.length)
    const maxDelta = Math.max(...restored.flatMap((row,i)=>row.map((v,j)=>Math.abs(v-baseline[i][j]))))
    assert.equal(maxDelta, 0, 'original layout geometry preserved')
    await page.evaluate(`document.querySelector('#original-logo-baseline').remove()`)
    const logo = await page.evaluate(`(()=>{const el=document.querySelector('.world-brand img'),r=el.getBoundingClientRect();return {width:r.width,height:r.height,fit:getComputedStyle(el).objectFit}})()`)
    assert.equal(logo.fit, 'contain')
    await page.evaluate(`document.querySelector('footer').scrollIntoView({behavior:'instant'})`)
    await pause(150)
    await page.screenshot(`artifacts/logo-restore/footer-${width}.png`)
    report.push({width,maxDelta,measuredElements:restored.length,logo})
    await page.close()
  }
  console.log(JSON.stringify(report))
} finally {
  await writeFile('artifacts/logo-restore/results.json',JSON.stringify(report,null,2))
  await browser.close()
}
