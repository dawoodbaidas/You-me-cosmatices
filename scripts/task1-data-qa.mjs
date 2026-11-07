import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'

const origin = 'http://127.0.0.1:5090'
const database = process.argv[2]
assert.match(database ?? '', /^http:\/\/127\.0\.0\.1:\d+$/)
const output = 'artifacts/performance/task1'
await mkdir(output, { recursive: true })
const stats = () => fetch(database + '/__test/stats').then(r => r.json())
const mutate = body => fetch(database + '/__test/product', { method: 'POST', body: JSON.stringify(body) }).then(r => r.json())
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(fn, timeout = 30000) {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { const value = await fn(); if (value) return value } catch (error) { last = error } await pause(100) }
  throw last ?? Error('Timed out')
}

// HTTP-only route checks isolate server reads from hydration and prefetching.
const routeResults = []
const categories = await fetch(database + '/rest/v1/store_categories').then(r => r.json())
const categoryRoute = '/categories/' + ['care', 'child'].map(slug => encodeURIComponent(categories.find(c => c.slug === slug).url_slug)).join('/')
for (const route of ['/', '/cart', '/products/body-mist', categoryRoute, '/category/all']) {
  const before = await stats()
  const response = await fetch(origin + route)
  assert.equal(response.status, 200)
  await response.text()
  const after = await stats()
  assert.equal(after.catalogueReads, before.catalogueReads, `${route} does not load full catalogue RPC`)
  assert.equal(after.revisionReads - before.revisionReads, 1, `${route} shares one revision read across layout/page`)
  if (route === '/cart') assert.equal(after.productReads, before.productReads)
  routeResults.push({ route, revisionReads: after.revisionReads - before.revisionReads, productReads: after.productReads - before.productReads, catalogueReads: 0 })
}
const baselineQueries = (await stats()).productQueries
assert.ok(baselineQueries.some(q => q.slug === 'eq.body-mist'))
assert.ok(baselineQueries.some(q => q['membership.category_slug'] === 'eq.child'))
assert.ok(baselineQueries.some(q => q.id?.startsWith('in.(')))

const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const profile = await mkdtemp(join(tmpdir(), 'you-me-task1-chrome-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let ws
try {
  const version = await poll(() => fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json()))
  ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), requests = [], errors = [], networkFailures = []
  ws.onmessage = event => {
    const data = JSON.parse(event.data)
    if (data.id) { const item = pending.get(data.id); if (!item) return; pending.delete(data.id); clearTimeout(item.timer); if (data.error) item.reject(Error(JSON.stringify(data.error))); else item.resolve(data.result) }
    if (data.method === 'Network.requestWillBeSent') requests.push({ session: data.sessionId, url: data.params.request.url })
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text)
    if (data.method === 'Network.loadingFailed') networkFailures.push(data.params)
  }
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const key = ++id
    const timer = setTimeout(() => { pending.delete(key); reject(Error('CDP timeout: ' + method)) }, 60000)
    pending.set(key, { resolve, reject, timer }); ws.send(JSON.stringify({ id: key, method, params, sessionId }))
  })
  const results = []
  for (const width of [390, 1440]) {
    console.log('Task 1 browser checks', width)
    // Reset only our loopback fixture between independent browser contexts.
    await mutate({ slug: 'package-laverne-you-miracle', imageUrl: '/products/package-laverne-you-miracle.webp', price: 12, stock: 8 })
    const { browserContextId } = await send('Target.createBrowserContext')
    const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const call = (method, params) => send(method, params, sessionId)
    console.log('Enabling page', { targetId, sessionId })
    await call('Page.enable'); console.log('Page enabled')
    await call('Runtime.enable'); console.log('Runtime enabled')
    await call('Network.enable')
    await call('Page.bringToFront')
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 2, mobile: width < 768 })
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    const evaluate = async expression => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
      return result.result.value
    }
    const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
    const navigate = async route => {
      await call('Page.navigate', { url: origin + route })
      await poll(() => evaluate(`location.pathname===${JSON.stringify(route)} && document.readyState==='complete'`))
      await pause(500) // SSR image completion alone does not establish hydration.
    }
    const productRequests = () => requests.filter(r => r.session === sessionId && r.url.includes('/api/store/products'))
    await navigate('/category/all')
    await poll(() => evaluate(`!!document.querySelector('[data-testid^="product-"] img')?.naturalWidth`))
    await pause(500)
    const first = '[data-testid="product-package-laverne-you-miracle"]'
    await click(`${first} [data-price-tag]`)
    await poll(() => evaluate(`!!document.querySelector('.mobile-shopping-bar')`))
    await click('.mobile-shopping-bar button')
    await poll(() => evaluate(`!!document.querySelector('.cart-dialog[open] img')?.naturalWidth`))
    await click('.cart-quantity button:first-child')
    await click('.cart-quantity button:last-child')
    await click('.cart-heading button')
    assert.equal(productRequests().length, 0, 'known add/cart/quantity need no product request')
    await click(`${first} button[class*="imageButton"]`)
    await poll(() => evaluate(`!!document.querySelector('.quickview-dialog[open] img')?.naturalWidth`))
    await click('.quickview-close')
    await poll(() => evaluate(`!new URLSearchParams(location.search).has('product') && !document.querySelector('.quickview-dialog[open]')`))
    assert.equal(productRequests().length, 0, 'known modal needs no product request')
    console.log('Known cart/modal reuse passed')
    await evaluate(`document.querySelector('.nav-search').click();document.querySelector('.nav-search').click()`)
    await poll(() => evaluate(`!!document.querySelector('.search-dialog[open] .search-result')`)).catch(async error => {
      console.log('Search failure', { errors, requests: productRequests(), state: await evaluate(`({dialogs:[...document.querySelectorAll('dialog')].map(d=>({open:d.open,html:d.outerHTML.slice(0,1000)})),alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent)})`) })
      throw error
    })
    assert.equal(productRequests().length, 1, 'concurrent search clicks share one fetch')
    await click('.search-sheet-header button')
    await click('.nav-search')
    await poll(() => evaluate(`!!document.querySelector('.search-dialog[open]')`))
    assert.equal(productRequests().length, 1, 'search reopening reuses current revision')
    console.log('Search reuse passed')
    await click('.search-sheet-header button')

    // Cross-route cart uses retained products; a full reload fetches only IDs.
    await click('.header-bag')
    await poll(() => evaluate(`!!document.querySelector('[data-testid="cart-page"] img')?.naturalWidth`))
    assert.equal(productRequests().length, 1)
    await navigate('/cart')
    await poll(() => evaluate(`!!document.querySelector('[data-testid="cart-page"] img')?.naturalWidth`))
    assert.equal(productRequests().length, 2)
    assert.ok(productRequests()[1].url.includes('?ids='), 'direct cart reload hydrates only persisted IDs')
    console.log('Direct cart hydration passed')
    await navigate('/category/all')
    await poll(() => evaluate(`!!document.querySelector('${first} img')?.naturalWidth`))
    await click('.nav-search')
    await poll(() => evaluate(`!!document.querySelector('.search-dialog[open] .search-result')`))
    await click('.search-sheet-header button')
    await click(`${first} button[class*="imageButton"]`)
    await poll(() => evaluate(`!!document.querySelector('.quickview-dialog[open] img')?.naturalWidth`))
    const changedAt = Date.now()
    console.log('Testing polling freshness')
    await mutate({ slug: 'package-laverne-you-miracle', imageUrl: '/products/body-mist.png', price: 17, stock: 1 })
    // No focus event: prove the visible-tab polling fallback updates an open modal.
    await poll(() => evaluate(`document.querySelector('.quickview-dialog[open]')?.textContent.includes('17.00') && [...document.querySelectorAll('.quickview-dialog[open] img')].some(img=>img.naturalWidth&&img.currentSrc.includes('body-mist'))`), 29000).catch(async error => {
      console.log('Freshness failure', JSON.stringify({ errors, networkFailures, requests: productRequests(), state: await evaluate(`({hidden:document.hidden,url:location.href,modal:document.querySelector('.quickview-dialog[open]')?.textContent,images:[...document.querySelectorAll('.quickview-dialog[open] img')].map(img=>({src:img.currentSrc,width:img.naturalWidth})),revisionReads:performance.getEntriesByType('resource').filter(e=>e.name.includes('store_revision')).map(e=>({url:e.name,duration:e.duration}))})`) }))
      throw error
    })
    const freshnessMs = Date.now() - changedAt
    console.log('Freshness observed', freshnessMs)
    assert.ok(freshnessMs < 30000)
    assert.equal(await evaluate(`[...document.querySelectorAll('.quickview-dialog[open] img')].some(img=>img.currentSrc.includes('laverne'))`), false, 'old-source artwork is absent after revision')
    await click('.quickview-close')
    await poll(() => evaluate(`!new URLSearchParams(location.search).has('product') && !document.querySelector('.quickview-dialog[open]')`))
    await click('.mobile-shopping-bar button')
    await poll(() => evaluate(`document.querySelector('.cart-dialog[open]')?.textContent.includes('17.00') && document.querySelector('.cart-dialog[open] img')?.currentSrc.includes('body-mist')`))
    assert.equal(await evaluate(`document.querySelector('.cart-quantity button:first-child').disabled`), true, 'new stock limit is applied')
    await click('.cart-heading button')
    await click('.nav-search')
    await poll(() => evaluate(`document.querySelector('.search-result')?.textContent.includes('17.00') && document.querySelector('.search-result img')?.currentSrc.includes('body-mist')`))
    await click('.search-sheet-header button')
    // Back/forward restores route data without letting an older snapshot win.
    await click('.header-bag')
    await poll(() => evaluate(`location.pathname==='/cart' && !!document.querySelector('[data-testid="cart-page"]')`))
    await pause(500) // Let the route's history entry commit before traversing it.
    await evaluate('history.back()')
    let historyIssue = null
    const historyReconciliation = await poll(() => evaluate(`location.pathname==='/category/all' && !!document.querySelector('${first}')`), 5000).then(() => true).catch(async () => {
      historyIssue = await evaluate(`({url:location.href,products:document.querySelectorAll('[data-testid^="product-"]').length,body:document.querySelector('main')?.textContent.slice(0,400)})`)
      console.log('Remaining history issue', JSON.stringify(historyIssue))
      const shot = await call('Page.captureScreenshot', { format: 'png' })
      await writeFile(`${output}/history-issue-${width}.png`, Buffer.from(shot.data, 'base64'))
      // Record this gate as failed; do not turn the data task into Task 3's
      // navigation/loading-boundary work. A direct load verifies current data.
      await navigate('/category/all')
      await poll(() => evaluate(`!!document.querySelector('${first}')`))
      return false
    })
    await click(`${first} button[class*="imageButton"]`)
    await poll(() => evaluate(`document.querySelector('.quickview-dialog[open]')?.textContent.includes('17.00')`))
    assert.equal(await evaluate(`[...document.querySelectorAll('.quickview-dialog[open] img')].some(img=>img.currentSrc.includes('laverne'))`), false)
    await click('.quickview-close')
    await poll(() => evaluate(`!new URLSearchParams(location.search).has('product') && !document.querySelector('.quickview-dialog[open]')`))
    await call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await evaluate(`window.dispatchEvent(new Event('online'))`)
    await mutate({ slug: 'package-laverne-you-miracle', price: 19, stock: 2 })
    await pause(250)
    await call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await evaluate(`window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('focus'))`)
    await poll(() => evaluate(`!!document.querySelector('${first}')`))
    await click(`${first} button[class*="imageButton"]`)
    await poll(() => evaluate(`document.querySelector('.quickview-dialog[open]')?.textContent.includes('19.00')`))
    const image = await call('Page.captureScreenshot', { format: 'png' })
    await writeFile(`${output}/reconciled-${width}.png`, Buffer.from(image.data, 'base64'))
    results.push({ width, knownCartAndModalProductRequests: 0, concurrentSearchRequests: 1, directCartIdRequests: 1, freshnessMs, updatedImageModalCartSearch: true, updatedPriceAndStock: true, historyReconciliation, historyIssue, reconnectFreshData: true })
    await send('Target.disposeBrowserContext', { browserContextId })
  }
  assert.deepEqual(errors, [])
  await writeFile(`${output}/functional.json`, JSON.stringify({ routeResults, results, errors }, null, 2) + '\n')
  console.log(JSON.stringify({ routeResults, results }, null, 2))
  await send('Browser.close')
  if (results.some(result => !result.historyReconciliation)) {
    console.log('Data checks passed; browser history/loading gate remains failed. See functional.json.')
    process.exitCode = 1
  }
} finally { ws?.close(); if (chrome.exitCode === null) chrome.kill() }
