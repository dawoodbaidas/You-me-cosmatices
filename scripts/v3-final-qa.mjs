import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const puppeteerPath = process.env.PUPPETEER_CORE
  || 'C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
const { default: puppeteer } = await import(pathToFileURL(puppeteerPath).href)
const base = process.argv[2] || process.env.QA_URL || 'http://localhost:3000'
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const output = 'artifacts/v5'
const report = { base, widths: [], checks: [], errors: [] }
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

await mkdir(output, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: chrome })
try {
  const page = await browser.newPage()
  page.on('pageerror', error => report.errors.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', request => {
    const error = request.failure()?.errorText ?? ''
    if (!/ERR_ABORTED/.test(error)) report.errors.push(`request: ${request.url()} ${error}`)
  })

  for (const width of [360, 390, 430, 768, 1024, 1440]) {
    const height = width >= 768 ? 1000 : 844
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 })
    await page.goto(base, { waitUntil: 'networkidle0', timeout: 90000 })
    await page.evaluate(() => document.fonts.ready)

    await page.evaluate(async () => {
      const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight * .78) {
        scrollTo(0, y)
        await sleep(90)
      }
      scrollTo(0, document.body.scrollHeight)
      await sleep(500)
      scrollTo(0, 0)
      await sleep(500)
      await Promise.all([...document.images].filter(image => !image.complete).map(image => new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true })
        image.addEventListener('error', resolve, { once: true })
        setTimeout(resolve, 3000)
      })))
      await sleep(700)
    })

    const data = await page.evaluate(() => {
      const rect = element => {
        const box = element.getBoundingClientRect()
        return {
          x: Math.round(box.x),
          y: Math.round(box.y + scrollY),
          w: Math.round(box.width),
          h: Math.round(box.height),
        }
      }
      const rectOf = selector => {
        const element = document.querySelector(selector)
        return element ? rect(element) : null
      }
      const images = [...document.querySelectorAll('.beauty-object img')]
      const cards = [...document.querySelectorAll('.beauty-object')]
      const bestImages = [...document.querySelectorAll('.best-photo img')]
      const hiddenCards = images.filter(image => image.getBoundingClientRect().width === 0).length
      const overflow = [...document.querySelectorAll('.boutique *')]
        .filter(element => {
          if (element.closest('.beauty-marquee, .beauty-world, .best-scene, .brand-story, .gift-scene, .footer-wordmark, .story-word, .world-watermark, .world-glow')) return false
          const box = element.getBoundingClientRect()
          return box.width > 0 && (box.right > innerWidth + 1 || box.left < -1)
        })
        .slice(0, 12)
        .map(element => ({ tag: element.tagName, cls: String(element.className).slice(0, 50), ...rect(element) }))
      const smallTargets = [...document.querySelectorAll('button, a[href]')]
        .filter(element => {
          const box = element.getBoundingClientRect()
          return box.width > 0 && box.height > 0 && (box.width < 30 || box.height < 30)
        })
        .map(element => ({ label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 28), tag: element.tagName, cls: String(element.className).slice(0, 40), ...rect(element) }))
      const hero = rectOf('.beauty-world')
      const cue = rectOf('.world-bottom')
      const firstImage = images[0]
      const firstBestImage = bestImages[0]
      return {
        document: { bodyWidth: document.body.scrollWidth, rootWidth: document.documentElement.scrollWidth, height: document.body.scrollHeight },
        hero,
        cue,
        visibleCards: cards.filter(card => card.getClientRects().length).length,
        hiddenCards,
        firstCard: cards[0] ? rect(cards[0]) : null,
        firstImage: firstImage ? {
          natural: [firstImage.naturalWidth, firstImage.naturalHeight],
          loaded: firstImage.naturalWidth > 0,
          fit: getComputedStyle(firstImage).objectFit,
          box: rect(firstImage),
        } : null,
        bestFirstImage: firstBestImage ? {
          loaded: firstBestImage.naturalWidth > 0,
          fit: getComputedStyle(firstBestImage).objectFit,
        } : null,
        overflow,
        smallTargets,
      }
    })

    assert.equal(data.document.bodyWidth, width, `${width}px body width`)
    assert.equal(data.document.rootWidth, width, `${width}px root width`)
    assert.equal(data.visibleCards, 12, `${width}px initial visible cards`)
    assert.equal(data.hiddenCards, 0, `${width}px hidden rendered product images`)
    assert.equal(data.firstImage?.loaded, true, `${width}px first product image loaded`)
    assert.equal(data.firstImage?.fit, 'contain', `${width}px product image fit`)
    assert.equal(data.bestFirstImage?.loaded, true, `${width}px first bestseller image loaded`)
    assert.equal(data.bestFirstImage?.fit, 'contain', `${width}px bestseller image fit`)
    assert.ok(data.cue && data.cue.y + data.cue.h <= height + 2, `${width}px hero cue within first viewport`)
    assert.deepEqual(data.smallTargets.filter(target => target.w < 24 || target.h < 24), [], `${width}px targets below 24px`)

    report.widths.push({ width, height, ...data })
    report.checks.push(`${width}px width, 12 rendered products, uncropped images, bestseller media, visible hero cue and 24px minimum targets passed`)
    console.log(`${width}px passed`, {
      body: data.document.bodyWidth,
      height: data.document.height,
      heroBottom: data.hero.y + data.hero.h,
      cueBottom: data.cue.y + data.cue.h,
      overflow: data.overflow.length,
      smallTargets: data.smallTargets.length,
    })

    await page.screenshot({ path: `${output}/full-${width}.png`, fullPage: true })
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await pause(450)
    await page.screenshot({ path: `${output}/hero-${width}.png` })

    if ([390, 1440].includes(width)) {
      for (const [name, selector] of [['bestsellers', '#bestsellers'], ['shop', '#shop'], ['gifts', '#gifts'], ['story', '#story'], ['footer', '.boutique-footer']]) {
        await page.evaluate(selector => document.querySelector(selector)?.scrollIntoView({ behavior: 'instant' }), selector)
        await pause(650)
        await page.screenshot({ path: `${output}/${name}-${width}.png` })
      }
    }
  }

  assert.deepEqual(report.errors, [])
  report.checks.push('no console, runtime or non-aborted request errors')
  await writeFile(`${output}/qa.json`, JSON.stringify(report, null, 2))
  console.log(`ALL ${report.widths.length} WIDTHS PASSED — report: ${output}/qa.json`)
} finally {
  await browser.close()
}
