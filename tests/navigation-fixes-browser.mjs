import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const origin = process.argv[2]
try {
 const page = await browser.newPage()
 const errors=[]
 page.on('pageerror', error => errors.push(error.message))
 for (const width of [375,390,430,1440]) {
  await page.setViewport({ width, height: 800 })
  await page.goto(origin+'/category/all',{waitUntil:'networkidle0'})
  await page.waitForSelector('#shop article')
  await page.click('#shop article [data-price-tag]')
  const count=await page.$eval('.header-bag > span',node=>node.textContent)
  await page.click('.filter-open')
  await page.waitForSelector('.filter-dialog[open]')
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden')
  await page.click('.shop-filter-form input')
  await page.click('.filter-sheet-actions button[type=submit]')
  assert.equal(await page.$('.filter-dialog[open]'),null)
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight))
  await page.click('.store-departments a[href="/category/care"]')
  await page.waitForFunction(()=>location.pathname==='/category/care')
  assert.ok(await page.evaluate(()=>scrollY)<100)
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}))
  const previousScroll = await page.evaluate(()=>scrollY)
  await page.click('.store-departments a[href="/category/perfumes"]')
  await page.waitForFunction(()=>location.pathname==='/category/perfumes')
  assert.ok(await page.evaluate(()=>scrollY)<100)
  await page.goBack(); await page.waitForFunction(()=>location.pathname==='/category/care')
  await new Promise(resolve=>setTimeout(resolve,500))
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-previousScroll)<30, `back should restore ${previousScroll}`)
  await page.goForward(); await page.waitForFunction(()=>location.pathname==='/category/perfumes')
  assert.equal(await page.$eval('.header-bag > span',node=>node.textContent),count)
  assert.equal(await page.$$eval('.mobile-shopping-bar',nodes=>nodes.length),1)
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('body *')].map(n=>({name:n.className,rect:n.getBoundingClientRect()})).filter(x=>x.rect.right>innerWidth+1||x.rect.left< -1).slice(0,8).map(x=>({name:String(x.name),left:x.rect.left,right:x.rect.right}))}))
  assert.ok(overflow.scroll<=overflow.width,JSON.stringify(overflow))
  await page.evaluate(()=>localStorage.clear())
  console.log(`passed ${width}`)
 }
 assert.deepEqual(errors,[])
} finally { await browser.close() }
