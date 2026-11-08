// Read-only regression check against a running storefront. No cart/database writes.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { launchBrowser, poll, pause } from './helpers/cdp-browser.mjs'

const origin = process.argv[2] ?? 'http://localhost:3000'
const artifacts = new URL('../artifacts/quickview/', import.meta.url)
await mkdir(artifacts, { recursive: true })
const browser = await launchBrowser()
const errors = [], report = []
browser.listen(event => {
  if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails)
  if (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') errors.push(event.params.args)
})
try {
  for (const width of [1440, 390]) {
    console.log(`Starting ${width}px browser check`)
    const page = await browser.page(width)
    console.log('Browser page ready')
    await page.navigate(new URL('/', origin).href)
    await poll(() => page.evaluate(`document.querySelector('[data-hero-product]')?.inert===false`), 60000)
    await pause(2400)
    // Sample every frame, including cold lazy import and immediate close frames.
    await page.evaluate(`window.geometry=()=>{
      const rect=el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};
      return [scrollX,scrollY,...rect(document.querySelector('#home')),...rect(document.querySelector('#home [data-scene-pin]')),
        ...Array.from(document.querySelectorAll('[data-hero-product]')).flatMap(el=>rect(el))];
    }`)
    const ids = await page.evaluate(`Array.from(document.querySelectorAll('[data-hero-product]')).map(el=>el.dataset.heroProduct)`)
    assert.ok(ids.length >= 3, 'several hero products available')
    for (const round of [0, 1]) {
      await page.evaluate(`window.scrollTo({top:${round ? "document.querySelector('#home').offsetTop+(document.querySelector('#home').offsetHeight-document.querySelector('#home [data-scene-pin]').offsetHeight)*.42" : '0'},behavior:'instant'})`)
      if (round) await poll(() => page.evaluate(`Array.from(document.querySelectorAll('[data-hero-product]')).every(el=>{const img=el.querySelector('img');return img?.complete&&img.naturalWidth>0})`))
      await pause(800)
      for (const id of round ? ids : ids.slice(0, 1)) {
        const selector = `[data-hero-product="${id}"]`
        await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus({preventScroll:true})`)
        await page.evaluate(`(()=>{window.baseline=geometry();window.samples=[];window.sampling=true;const sample=()=>{if(!window.sampling)return;window.samples.push(geometry());requestAnimationFrame(sample)};requestAnimationFrame(sample)})()`)
        const point = await page.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).querySelector('[data-hero-hit]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
        await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
        await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
        await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
        await poll(() => page.evaluate(`document.querySelector('dialog[open] [data-product-id]')?.dataset.productId===${JSON.stringify(id)}`))
        assert.equal(await page.evaluate(`document.querySelector('dialog[open]').parentElement.parentElement===document.body`), true, 'body portal')
        assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('dialog[open]')).position`), 'fixed')
        await pause(180)
        await page.screenshot(new URL(`open-${width}-${round}-${ids.indexOf(id)}.png`, artifacts).pathname.replace(/^\/(\w:)/, '$1'))
        // Tab wraps to the close button from the last control.
        await page.evaluate(`(()=>{const controls=[...document.querySelector('dialog[open]').querySelectorAll('button:not(:disabled),a[href]')];controls.at(-1).focus()})()`)
        await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
        assert.equal(await page.evaluate(`document.activeElement.hasAttribute('data-dialog-autofocus')`), true, 'focus trapped')
        const closeMode = ids.indexOf(id) % 3
        if (closeMode === 0) {
          await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
        } else if (closeMode === 1) await page.click('[data-dialog-autofocus]')
        else await page.click('dialog[open]')
        await poll(() => page.evaluate(`!document.querySelector('dialog[open]')`))
        await pause(220)
        const result = await page.evaluate(`(()=>{window.sampling=false;return {frames:samples.length,maxDelta:Math.max(...samples.flatMap(s=>s.map((v,i)=>Math.abs(v-baseline[i])))),focus:document.activeElement.dataset.heroProduct,overflow:document.documentElement.style.overflow,bodyOverflow:document.body.style.overflow,curtains:document.querySelectorAll('[data-curtain]').length,entranceHidden:document.querySelector('[data-home-entrance]')?.hidden}})()`)
        report.push({ width, round, id, closeMode, ...result })
        assert.ok(result.maxDelta < 1, `hero/scroll geometry changed: ${JSON.stringify(report.at(-1))}`)
        assert.equal(result.focus, id, 'focus restored to selected product')
        assert.equal(result.overflow, '', 'document lock restored')
        assert.equal(result.bodyOverflow, '', 'body untouched')
        assert.equal(result.curtains, 0, 'broken curtains removed')
        assert.equal(result.entranceHidden, true, 'independent logo entrance stays finished')
      }
    }
    await page.screenshot(new URL(`closed-${width}.png`, artifacts).pathname.replace(/^\/(\w:)/, '$1'))
    await page.close()
  }
  assert.deepEqual(errors, [], 'no runtime errors')
  console.log(`PASS: ${report.length} Quick View cycles; desktop/mobile, product identity, frame-by-frame geometry, three close methods, scroll/focus cleanup.`)
} catch (error) {
  console.error(error)
  throw error
} finally {
  await writeFile(new URL('results.json', artifacts), JSON.stringify({ report, errors }, null, 2))
  await browser.close()
}
