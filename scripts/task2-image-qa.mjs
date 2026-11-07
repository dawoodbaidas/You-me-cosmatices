// Native CDP: no machine-specific Puppeteer module or extra dependency required.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'

const origin = process.env.PERFORMANCE_ORIGIN ?? 'http://127.0.0.1:5090'
assert.equal(new URL(origin).hostname, '127.0.0.1', 'Only an isolated loopback server is allowed')
const runs = Number(process.env.PERFORMANCE_RUNS ?? 5)
const output = 'artifacts/performance/task2'
await mkdir(output, { recursive: true })
const profile = await mkdtemp(join(tmpdir(), 'you-me-media-chrome-'))
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const debugPort = probe.address().port
await new Promise(resolve => probe.close(resolve))
const chrome = spawn(process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(check, timeout = 30000) {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { const value = await check(); if (value) return value } catch (error) { last = error } await pause(100) }
  throw last ?? new Error('Timed out')
}
let ws
try {
  const version = await poll(async () => (await fetch(`http://127.0.0.1:${debugPort}/json/version`, { signal: AbortSignal.timeout(1000) })).json())
  ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), listeners = new Map()
  ws.onmessage = event => {
    const data = JSON.parse(event.data)
    if (data.id) { const call = pending.get(data.id); if (!call) return; pending.delete(data.id); clearTimeout(call.timer); if (data.error) call.reject(new Error(JSON.stringify(data.error))); else call.resolve(data.result) }
    else for (const listener of listeners.get(data.method) ?? []) listener(data.params, data.sessionId)
  }
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const key = ++id
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(`CDP timeout: ${method}`)) }, 120000)
    pending.set(key, { resolve, reject, timer }); ws.send(JSON.stringify({ id: key, method, params, sessionId }))
  })
  const errors = []
  listeners.set('Runtime.exceptionThrown', [(event) => errors.push(event.exceptionDetails.exception?.description ?? event.exceptionDetails.text)])
  async function page(width = 390, height = 844, throttle = false) {
    const { browserContextId } = await send('Target.createBrowserContext')
    const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const call = (method, params) => send(method, params, sessionId)
    await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable')
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: width < 768 })
    if (throttle) {
      await call('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8 })
      await call('Emulation.setCPUThrottlingRate', { rate: 4 })
    }
    const evaluate = async expression => {
      const data = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (data.exceptionDetails) throw new Error(data.exceptionDetails.exception?.description ?? data.exceptionDetails.text)
      return data.result.value
    }
    const navigate = async route => {
      console.log('Navigating', route)
      await call('Page.navigate', { url: origin + route })
      await poll(() => evaluate(`location.pathname === ${JSON.stringify(route)} && document.readyState === 'complete'`), 120000)
      console.log('Loaded', route)
    }
    const click = async selector => {
      const rect = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...rect })
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...rect })
    }
    const screenshot = async name => { const { data } = await call('Page.captureScreenshot', { format: 'png' }); await writeFile(`${output}/${name}.png`, Buffer.from(data, 'base64')) }
    return { call, evaluate, navigate, click, screenshot, close: () => send('Target.disposeBrowserContext', { browserContextId }) }
  }
  const results = []
  if (!process.argv.includes('--functional-only')) {
    for (const route of ['/', '/category/all']) for (let run = 1; run <= runs; run++) {
      const p = await page(390, 844, true)
      await p.call('Page.addScriptToEvaluateOnNewDocument', { source: `
        window.metrics={lcp:0,cls:0,events:[]};
        new PerformanceObserver(l=>{for(const e of l.getEntries()){metrics.lcp=e.startTime;metrics.lcpElement={url:e.url,tag:e.element?.tagName,renderTime:e.renderTime,loadTime:e.loadTime,html:e.element?.outerHTML.slice(0,500)}}}).observe({type:'largest-contentful-paint',buffered:true});
        new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)metrics.cls+=e.value}).observe({type:'layout-shift',buffered:true});
        new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.interactionId)metrics.events.push(e.duration)}).observe({type:'event',buffered:true,durationThreshold:16});` })
      for (const visit of ['cold', 'warm']) {
        await p.navigate(route); await pause(5000)
        await p.click('.header-bag'); await pause(500)
        const data = await p.evaluate(`(()=>{const r=performance.getEntriesByType('resource'),n=performance.getEntriesByType('navigation')[0];const sum=a=>a.reduce((s,e)=>s+e.transferSize,0);return {...metrics,inpObserved:Math.max(0,...metrics.events),images:sum(r.filter(e=>e.name.includes('/_next/image')||/\\.(png|jpe?g|webp|avif)(\\?|$)/.test(e.name))),js:sum(r.filter(e=>e.name.includes('.js'))),requests:r.length,ttfb:n.responseStart,resources:r.map(e=>({name:e.name,bytes:e.transferSize,start:e.startTime,responseEnd:e.responseEnd,duration:e.duration}))}})()`)
        results.push({ route, run, visit, ...data })
        if (run === 1) await p.screenshot(`${route === '/' ? 'home' : 'shop'}-${visit}`)
        console.log(JSON.stringify({ route, run, visit, lcp: data.lcp, cls: data.cls, images: data.images, js: data.js }))
      }
      await p.close()
      // Persist after each pair; interrupted work never loses verified samples.
      await writeFile(`${output}/measurements.json`, JSON.stringify({ profile: { width: 390, height: 844, dpr: 2, cpu: 4, latency: 150, download: 1600000, upload: 750000 }, samples: results }, null, 2))
    }
  }
  const functional = []
  for (const width of process.argv.includes('--measure-only') ? [] : [390, 1440]) {
    console.log('Functional checks:', width)
    const p = await page(width, 900)
    await p.navigate('/category/all')
    await poll(() => p.evaluate(`!!document.querySelector('[data-testid^="product-"] img')?.naturalWidth`))
    await pause(500)
    const first = '[data-testid^="product-"]'
    const before = await p.evaluate(`document.querySelector('${first} img').currentSrc`)
    // Block the detail upgrade: the decoded listing must remain visible on failure.
    const listingWidth = new URL(before).searchParams.get('w')
    await p.call('Network.setBlockedURLs', { urls: [16,32,48,64,96,128,256,384,640,750,828,1080,1200,1920,2048,3840].filter(w => String(w) !== listingWidth).map(w => `*w=${w}&*`) })
    await p.evaluate(`document.querySelector('${first} button[class*="imageButton"]').click()`)
    await poll(() => p.evaluate(`!!document.querySelector('.quickview-dialog[open] img')?.naturalWidth`))
    // Desktop listing and detail can resolve to the same optimized URL. In that
    // case onLoad completes immediately and the temporary preview is removed.
    const failedUpgradeExercised = await p.evaluate(`!!document.querySelector('.quickview-dialog[open] img[data-image-preview]')`)
    assert.equal(await p.evaluate(`document.querySelector('.quickview-dialog[open] img')?.currentSrc`), before, 'loaded listing rendition appears immediately')
    await pause(500)
    assert.ok(await p.evaluate(`!!document.querySelector('.quickview-dialog[open] img')?.naturalWidth`), 'upgrade failure keeps usable preview')
    await p.screenshot(`preview-${width}`)
    await p.evaluate(`document.querySelector('.quickview-close').click()`)
    await poll(() => p.evaluate(`!document.querySelector('.quickview-dialog[open]')`))
    const warmModalMs = await p.evaluate(`new Promise((resolve,reject)=>{const start=performance.now();document.querySelector('${first} button[class*="imageButton"]').click();const check=()=>{const img=document.querySelector('.quickview-dialog[open] img');if(img?.naturalWidth&&document.querySelector('.quickview-dialog[open] .quickview-buy'))resolve(performance.now()-start);else if(performance.now()-start>5000)reject(Error('Warm modal timeout'));else requestAnimationFrame(check)};requestAnimationFrame(check)})`)
    await p.evaluate(`document.querySelector('.quickview-close').click()`)
    await poll(() => p.evaluate(`!document.querySelector('.quickview-dialog[open]')`))
    // A different source must get its own preview, never the previous product's.
    const second = 'article[data-testid^="product-"]:nth-of-type(2)'
    const secondSource = await p.evaluate(`document.querySelector('${second} img').currentSrc`)
    await p.evaluate(`document.querySelector('${second} button[class*="imageButton"]').click()`)
    await poll(() => p.evaluate(`!!document.querySelector('.quickview-dialog[open] img')?.naturalWidth`))
    assert.notEqual(secondSource, before)
    assert.equal(await p.evaluate(`document.querySelector('.quickview-dialog[open] img').currentSrc`), secondSource)
    await p.evaluate(`document.querySelector('.quickview-close').click()`)
    await poll(() => p.evaluate(`!document.querySelector('.quickview-dialog[open]')`))
    await p.call('Network.setBlockedURLs', { urls: [] })
    await p.evaluate(`document.querySelector('${first} button[class*="imageButton"]').click()`)
    await poll(() => p.evaluate(`!!document.querySelector('.quickview-dialog[open] img:not([data-image-preview])')?.naturalWidth`))
    await pause(200)
    await p.evaluate(`document.querySelector('.quickview-close').click()`)
    await poll(() => p.evaluate(`!document.querySelector('.quickview-dialog[open]')`))
    // Add known product; opening the cart should reuse the loaded larger rendition.
    await p.evaluate(`document.querySelector('${first} [data-price-tag]').click()`)
    await pause(300)
    await p.evaluate(`document.querySelector('.mobile-shopping-bar button').click()`)
    await poll(() => p.evaluate(`!!document.querySelector('.cart-dialog[open] img')?.naturalWidth`)).catch(async error => {
      console.log(await p.evaluate(`JSON.stringify({cart:localStorage.getItem('you-and-me-cart-v1'),dialogs:[...document.querySelectorAll('dialog')].map(d=>({open:d.open,html:d.outerHTML.slice(0,1400)})),toast:document.querySelector('[role=alert]')?.textContent})`))
      await p.screenshot(`cart-failure-${width}`)
      throw error
    })
    assert.ok(await p.evaluate(`document.querySelector('.cart-dialog[open] img')?.hasAttribute('data-image-preview')`), 'cart reuses cached rendition')
    await p.evaluate(`document.querySelector('.cart-heading button').click()`)
    await poll(() => p.evaluate(`!document.querySelector('.cart-dialog[open]')`))
    const warmCartMs = await p.evaluate(`new Promise((resolve,reject)=>{const start=performance.now();document.querySelector('.mobile-shopping-bar button').click();const check=()=>{if(document.querySelector('.cart-dialog[open] img')?.naturalWidth)resolve(performance.now()-start);else if(performance.now()-start>5000)reject(Error('Warm cart timeout'));else requestAnimationFrame(check)};requestAnimationFrame(check)})`)
    assert.ok(await p.evaluate(`document.documentElement.scrollWidth<=innerWidth`), 'no horizontal overflow')
    const duplicates = await p.evaluate(`(()=>{const groups=new Map();for(const e of performance.getEntriesByType('resource'))if(e.name.includes('/_next/image')&&e.transferSize>300)groups.set(e.name,(groups.get(e.name)||0)+1);return [...groups].filter(([,n])=>n>1)})()`)
    assert.deepEqual(duplicates, [], 'identical optimized URLs have no duplicate body transfers')
    await p.screenshot(`cart-${width}`)
    await p.evaluate(`document.querySelector('.cart-heading button').click(); document.querySelector('.header-bag').click()`)
    await poll(() => p.evaluate(`!!document.querySelector('[data-testid="cart-page"] img[data-image-preview]')?.naturalWidth`))
    await p.evaluate(`document.querySelector('[data-testid="cart-items"] [role="group"] button:first-child').click()`)
    await poll(() => p.evaluate(`document.querySelector('[data-testid="cart-items"] [aria-live="polite"]').textContent==='2'`))
    await p.evaluate(`document.querySelector('[data-testid="cart-items"] [role="group"] button:last-child').click()`)
    await poll(() => p.evaluate(`document.querySelector('[data-testid="cart-items"] [aria-live="polite"]').textContent==='1'`))
    assert.ok(await p.evaluate(`!!document.querySelector('[data-testid="cart-page"] img[data-image-preview]')?.naturalWidth`), 'quantity edits preserve cached cart image')
    await p.evaluate(`document.querySelector('[data-testid="cart-items"] li > button').click()`)
    await poll(() => p.evaluate(`!!document.querySelector('[data-testid="cart-empty"]')`))
    functional.push({ width, listingPreview: true, upgradeFailureRetainsPreview: failedUpgradeExercised, identicalListingAndDetail: !failedUpgradeExercised, sourceIsolation: true, cartReuse: true, cartPageReuse: true, cartQuantityAndRemoval: true, warmModalMs, warmCartMs, duplicateBodyTransfers: duplicates })
    await p.close()
  }
  if (!process.argv.includes('--measure-only')) {
    const p = await page()
    await p.navigate('/qa-images')
    await poll(() => p.evaluate(`!!document.querySelector('[data-image-fixture] img')?.naturalWidth`))
    const oldSource = await p.evaluate(`document.querySelector('[data-image-fixture] img').currentSrc`)
    await p.call('Network.setBlockedURLs', { urls: ['*body-mist*'] })
    await p.evaluate(`document.querySelector('[data-source="1"]').click()`)
    await poll(() => p.evaluate(`document.querySelector('[data-image-fixture]').getAttribute('data-image-fixture')==='1'`))
    assert.equal(await p.evaluate(`document.querySelector('[data-image-fixture]').innerHTML.includes('laverne')`), false, 'same component with replacement URL never retains old image')
    await p.evaluate(`document.querySelector('[data-source="0"]').click()`)
    await poll(() => p.evaluate(`!!document.querySelector('[data-image-fixture] img')?.naturalWidth`))
    assert.equal(await p.evaluate(`document.querySelector('[data-image-fixture] img').currentSrc`), oldSource)
    await p.evaluate(`document.querySelector('[data-source="2"]').click()`)
    await poll(() => p.evaluate(`!!document.querySelector('[data-image-fixture] .product-image-fallback')`))
    functional.push({ replacementUrlClearsOldPreview: true, missingImageFallback: true })
    await p.close()
  }
  if (!process.argv.includes('--measure-only')) for (const width of [390, 1440]) {
    const p = await page(width, 900)
    await p.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await p.call('Page.addScriptToEvaluateOnNewDocument', { source: `window.alphaScans=0;const read=CanvasRenderingContext2D.prototype.getImageData;CanvasRenderingContext2D.prototype.getImageData=function(...args){alphaScans++;return read.apply(this,args)}` })
    await p.navigate('/')
    await poll(() => p.evaluate(`!!document.querySelector('#home img')?.naturalWidth`))
    assert.ok(await p.evaluate(`[...document.querySelectorAll('#bestsellers [data-showcase-item]')].filter(e=>e.querySelector('img')).length<=2`), 'only active/adjacent scene media mount initially (a handoff can contain two image layers)')
    await p.evaluate(`document.querySelector('#bestsellers').scrollIntoView()`)
    await poll(() => p.evaluate(`!!document.querySelector('#bestsellers [data-showcase-item] img:not([data-image-preview])')?.naturalWidth && !document.querySelector('#bestsellers [data-showcase-item] img[data-image-preview]')`))
    await p.evaluate(`window.retainedScene=document.querySelector('#bestsellers [data-showcase-item] img'); document.querySelectorAll('#bestsellers [class*="showcaseDots"] button')[4].click()`)
    await poll(() => p.evaluate(`document.querySelectorAll('#bestsellers [class*="showcaseDots"] button')[4].getAttribute('aria-current')==='true'`))
    await poll(() => p.evaluate(`[...document.querySelectorAll('#bestsellers img')].every(img=>img.complete&&img.naturalWidth)`))
    await pause(200)
    const scans = await p.evaluate(`alphaScans`)
    await p.evaluate(`document.querySelectorAll('#bestsellers [class*="showcaseDots"] button')[0].click()`)
    await poll(() => p.evaluate(`document.querySelectorAll('#bestsellers [class*="showcaseDots"] button')[0].getAttribute('aria-current')==='true'`))
    assert.equal(await p.evaluate(`document.querySelector('#bestsellers [data-showcase-item] img')===retainedScene`), true, 'returning to visited Best-Selling item retains its image DOM')
    assert.equal(await p.evaluate(`alphaScans`), scans, 'return does not repeat alpha scanning')
    const mask = await p.evaluate(`document.querySelector('#home mask image')?.getAttribute('href')`)
    if (mask) assert.equal(mask, await p.evaluate(`document.querySelector('#home [data-hero-product] img').currentSrc`), 'shine mask reuses Hero rendition')
    await p.screenshot(`bestsellers-${width}`)
    functional.push({ width, bestSellingRetainedNode: true, repeatedAlphaScans: 0, heroMaskReuse: !!mask, reducedMotion: true })
    await p.close()
  }
  assert.deepEqual(errors, [], 'no uncaught browser exceptions')
  if (functional.length) {
    await writeFile(`${output}/functional.json`, JSON.stringify(functional, null, 2))
    console.log('PASS: image preview, failed upgrade, cart reuse, no duplicate body transfers, responsive overflow')
  }
  await send('Browser.close')
} finally {
  ws?.close()
  if (chrome.exitCode === null) chrome.kill()
}
