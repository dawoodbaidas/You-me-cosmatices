import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const label = process.argv[2] ?? 'before'
const origin = process.argv[3] ?? 'http://localhost:3012'
if (!/^[a-z-]+$/.test(label) || !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local profiling only')
await mkdir('artifacts/data-performance', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
try {
  for (const width of [390, 1440]) for (let run = 0; run < 5; run++) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: width === 390 ? 2 : 1 })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    if (width === 390) {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 })
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    }
    await page.addInitScript(() => {
      window.qaMetrics = { lcp: 0, cls: 0, events: [], lcpUrl: '' }
      new PerformanceObserver(list => { for (const e of list.getEntries()) { window.qaMetrics.lcp = e.startTime; window.qaMetrics.lcpUrl = e.url } }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.qaMetrics.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (e.interactionId) window.qaMetrics.events.push(e.duration) }).observe({ type: 'event', buffered: true, durationThreshold: 16 })
    })
    for (const route of ['/', '/category/all']) for (const cache of ['cold', 'warm']) {
      if (cache === 'cold') await cdp.send('Network.clearBrowserCache')
      const start = Date.now()
      await page.goto(origin + route, { waitUntil: 'load', timeout: 120000 })
      await page.waitForTimeout(2000)
      if (route === '/category/all') assert.ok(await page.locator('article[data-testid^="product-"]').count(), 'Real products must load')
      const data = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource').map(e => ({ url: e.name, initiator: e.initiatorType, bytes: e.transferSize, duration: e.duration }))
        return { ...window.qaMetrics, ttfb: performance.getEntriesByType('navigation')[0].responseStart, resources, images: [...document.images].filter(i => i.currentSrc).map(i => ({ src: i.currentSrc, width: i.naturalWidth, height: i.naturalHeight })) }
      })
      const apis = []
      const record = req => { if (req.url().includes('/api/store/products')) apis.push(new URL(req.url()).pathname + new URL(req.url()).search) }
      page.on('request', record)
      const searches = []
      for (let i = 0; i < 2; i++) {
        const began = performance.now()
        await page.locator('.nav-search').click()
        await page.locator('.search-dialog[open]').waitFor({ timeout: 30000 })
        searches.push(performance.now() - began)
        await page.keyboard.press('Escape')
      }
      let modalMs = null
      if (route === '/category/all') {
        const began = performance.now()
        await page.locator('article[data-testid^="product-"] h3 a').first().click()
        await page.locator('.quickview-dialog[open]').waitFor()
        modalMs = performance.now() - began
        await page.keyboard.press('Escape')
      }
      page.off('request', record)
      results.push({ width, run, route, cache, start, end: Date.now(), ...data, searches, modalMs, apis })
      console.log(JSON.stringify({ width, run, route, cache, lcp: Math.round(data.lcp), ttfb: Math.round(data.ttfb), searches: searches.map(Math.round), apiRequests: apis.length }))
    }
    await context.close()
  }
} finally {
  await writeFile(`artifacts/data-performance/${label}.json`, JSON.stringify(results, null, 2))
  await browser.close()
}
