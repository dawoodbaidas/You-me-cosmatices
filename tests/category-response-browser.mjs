import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const [label = 'before', origin = 'http://localhost:3016'] = process.argv.slice(2)
assert.match(label, /^[a-z-]+$/)
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
await mkdir('artifacts/category-response', { recursive: true })
try {
  for (const width of [360, 390, 1440]) for (const slow of [false, true]) {
    const context = await browser.createBrowserContext(), page = await context.newPage()
    await page.setViewport({ width, height: 900, isMobile: width < 768, hasTouch: width < 768 })
    await page.setCacheEnabled(false)
    const cdp = await page.createCDPSession()
    if (slow) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 })
    await page.evaluateOnNewDocument(() => {
      window.metrics = { lcp: 0, cls: 0, shiftTotal: 0, shifts: [], clicks: [] }
      let sessionStart = 0, previousShift = 0, sessionValue = 0
      new PerformanceObserver(list => { for (const e of list.getEntries()) window.metrics.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) {
        if (e.startTime - previousShift > 1000 || e.startTime - sessionStart > 5000) { sessionStart = e.startTime; sessionValue = 0 }
        previousShift = e.startTime; sessionValue += e.value
        window.metrics.cls = Math.max(window.metrics.cls, sessionValue)
        window.metrics.shiftTotal += e.value
        window.metrics.shifts.push({ at: e.startTime, value: e.value, sources: e.sources.map(s => ({ element: s.node?.tagName, class: s.node?.className, from: s.previousRect.toJSON(), to: s.currentRect.toJSON() })) })
      } }).observe({ type: 'layout-shift', buffered: true })
      document.addEventListener('click', e => {
        const link = e.target.closest('a[href*="/categor"]')
        if (!link) return
        const click = { path: new URL(link.href).pathname, at: performance.now() }
        window.metrics.clicks.push(click)
        const frame = () => {
          if (!click.visible && document.querySelector('.category-skeleton,[data-store-route="' + click.path + '"]')) click.visible = performance.now() - click.at
          if (document.querySelector('[data-store-route="' + click.path + '"]')) click.committed = performance.now() - click.at
          if (!click.committed && performance.now() - click.at < 30000) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }, true)
      window.addEventListener('store:navigate', () => { const c = window.metrics.clicks.at(-1); if (c) c.started = performance.now() - c.at })
    })
    await page.goto(origin, { waitUntil: 'networkidle0', timeout: 120000 })
    await page.waitForFunction(() => !document.querySelector('#intro'), { timeout: 30000 })
    const routes = await page.$$eval('a[href^="/categories/"]', links => [...new Set(links.map(e => e.getAttribute('href')))])
    assert.ok(routes.length >= 2, 'Public categories must be available')
    for (const surface of [width < 768 ? 'menu' : 'mega', 'strip']) {
      let selector
      if (surface === 'menu') {
        await page.tap('.menu-trigger')
        selector = '.shopping-menu a[href="' + routes[0] + '"]'
      } else if (surface === 'mega') {
        await page.hover('.mega-anchor')
        selector = '#shop-mega a[href="' + routes[0] + '"]'
      } else selector = '.store-departments a[href="' + routes[1] + '"]'
      await page.waitForSelector(selector, { visible: true })
      await page.$eval(selector, e => e.scrollIntoView({ block: 'center' }))
      if (width < 768) await page.tap(selector); else await page.click(selector)
      await page.waitForFunction(() => window.metrics.clicks.at(-1)?.committed, { timeout: 60000 })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    }
    const metrics = await page.evaluate(() => window.metrics)
    assert.equal(metrics.clicks.length, 2, 'Each destination must open after exactly one physical click/tap')
    if (label === 'after') for (const click of metrics.clicks) assert.ok(click.visible < 100, `Visual response took ${click.visible}ms`)
    results.push({ width, slow, ...metrics })
    console.log(JSON.stringify({ width, slow, lcp: metrics.lcp, cls: metrics.cls, clicks: metrics.clicks }))
    await page.screenshot({ path: `artifacts/category-response/${label}-${width}-${slow}.png` })
    await context.close()
  }
} finally {
  await writeFile(`artifacts/category-response/${label}.json`, JSON.stringify(results, null, 2))
  await browser.close()
}
