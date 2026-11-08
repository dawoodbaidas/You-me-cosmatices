import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const [label = 'before', origin = 'http://localhost:3015'] = process.argv.slice(2)
assert.match(label, /^[a-z-]+$/)
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
await mkdir('artifacts/store-speed', { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext(), page = await context.newPage()
    await page.setViewport({ width, height: 900, deviceScaleFactor: width < 768 ? 2 : 1 })
    const errors = [], requests = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('request', r => requests.push({ url: r.url(), type: r.resourceType(), at: Date.now() }))
    await page.evaluateOnNewDocument(() => {
      window.speed = { lcp: 0, images: [], useful: 0 }
      new PerformanceObserver(list => { for (const e of list.getEntries()) window.speed.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
      document.addEventListener('load', e => {
        if (e.target instanceof HTMLImageElement) window.speed.images.push({ src: e.target.currentSrc, at: performance.now(), hero: !!e.target.closest('#home'), best: !!e.target.closest('#bestsellers') })
      }, true)
      const observer = new MutationObserver(() => {
        if (document.documentElement.dataset.intro === 'done' && !window.speed.useful) window.speed.useful = performance.now()
      })
      observer.observe(document, { subtree: true, attributes: true, attributeFilter: ['data-intro'] })
    })
    for (const cache of ['cold', 'warm']) {
      requests.length = 0
      await page.goto(origin, { waitUntil: 'networkidle0', timeout: 120000 })
      await page.waitForFunction(() => !document.querySelector('#intro'), { timeout: 30000 })
      await page.waitForFunction(() => [...document.querySelectorAll('#home img')].length > 0 && [...document.querySelectorAll('#home img')].every(i => i.complete && i.naturalWidth), { timeout: 60000 })
      const home = await page.evaluate(() => ({ ...window.speed, nav: performance.getEntriesByType('navigation')[0].toJSON(), resources: performance.getEntriesByType('resource').map(r => r.toJSON()), hero: [...document.querySelectorAll('#home img')].map(i => ({ src: i.currentSrc, width: i.naturalWidth, rendered: i.getBoundingClientRect().width })) }))
      await page.$eval('#bestsellers', e => e.scrollIntoView())
      await page.waitForFunction(() => [...document.querySelectorAll('#bestsellers img')].some(i => i.complete && i.naturalWidth), { timeout: 60000 })
      const best = await page.evaluate(() => window.speed.images.filter(i => i.best))
      results.push({ width, cache, kind: 'home', ...home, best, requests: [...requests], errors: [...errors] })
      console.log(label, width, cache, 'home', Math.round(home.nav.responseStart), 'hero', Math.round(Math.max(...home.images.filter(i => i.hero).map(i => i.at))), 'useful', Math.round(home.useful))
    }
    await page.goto(origin + '/categories', { waitUntil: 'networkidle0' })
    const routes = await page.$$eval('a[href^="/categories/"]', els => [...new Set(els.map(e => e.getAttribute('href')))].slice(0, 3))
    assert.ok(routes.length >= 2, 'Real categories required')
    await page.goto(origin, { waitUntil: 'networkidle0' })
    for (const route of [...routes, routes[0]]) {
      const link = await page.$(`a[href="${route}"]`)
      assert.ok(link, `Category link ${route}`)
      await link.evaluate(e => e.scrollIntoView({ block: 'center' }))
      await link.hover()
      await new Promise(resolve => setTimeout(resolve, 700))
      requests.length = 0
      const start = Date.now()
      await link.click()
      await page.waitForFunction(path => document.querySelector('[data-store-route]')?.dataset.storeRoute === path, { timeout: 60000 }, route)
      const committed = Date.now() - start
      const state = await page.evaluate(() => ({ path: location.pathname, y: scrollY, products: [...document.querySelectorAll('article[data-testid]')].map(e => ({ id: e.dataset.testid, text: e.innerText })), overflow: document.documentElement.scrollWidth > innerWidth }))
      assert.equal(state.overflow, false)
      await new Promise(resolve => setTimeout(resolve, 500))
      const data = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => r.name.includes('_rsc')).map(r => r.toJSON()))
      results.push({ width, kind: 'navigation', route, committed, state, requests: [...requests], data, errors: [...errors] })
      console.log(label, width, 'navigate', route, committed)
    }
    await page.goBack({ waitUntil: 'networkidle0' }); await page.goForward({ waitUntil: 'networkidle0' })
    await page.screenshot({ path: `artifacts/store-speed/${label}-${width}.png` })
    await context.close()
  }
} finally {
  await writeFile(`artifacts/store-speed/${label}.json`, JSON.stringify(results, null, 2))
  await browser.close()
}
