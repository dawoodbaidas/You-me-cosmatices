import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const origin = process.argv[2] || 'http://localhost:3000'
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewport({ width: 320, height: 800 })
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#intro.playing')
  assert.equal(await page.$eval('body', e => getComputedStyle(e).overflow), 'hidden')
  for (const width of [320, 339, 340, 390, 400, 767, 768, 1440]) {
    await page.setViewport({ width, height: 800 })
    const state = await page.evaluate(() => {
      const l = document.querySelector('#intro .l').getBoundingClientRect()
      const r = document.querySelector('#intro .r').getBoundingClientRect()
      const logo = document.querySelector('.intro-lockup').getBoundingClientRect()
      return { overlap: l.right >= r.left, fits: logo.left >= 0 && logo.right <= innerWidth,
        overflow: document.documentElement.scrollWidth > innerWidth,
        subtitle: getComputedStyle(document.querySelector('.intro-subtitle')).display,
        rule: getComputedStyle(document.querySelector('.intro-subtitle i')).display }
    })
    assert.ok(state.overlap, `panel seam ${width}`)
    assert.ok(state.fits, `logo fit ${width}`)
    assert.equal(state.overflow, false, `overflow ${width}`)
    assert.equal(state.subtitle === 'none', width < 340)
    assert.equal(state.rule === 'none', width < 400)
  }
  await page.waitForFunction(() => !document.querySelector('#intro'))
  assert.notEqual(await page.$eval('body', e => getComputedStyle(e).overflow), 'hidden')
  assert.equal(await page.evaluate(() => sessionStorage.getItem('intro-played')), '1')
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await page.$('#intro'), null)
  await page.evaluate(() => sessionStorage.clear())
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await page.$('#intro'), null)
  assert.notEqual(await page.$eval('body', e => getComputedStyle(e).overflow), 'hidden')
  assert.deepEqual(errors, [])
  console.log('PASS: widths, seam, scroll, removal, session, reduced motion, runtime errors')
} finally { await browser.close() }
