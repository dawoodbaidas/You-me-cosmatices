import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const origin=process.argv[2]
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
try {
 const page=await browser.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('console',msg=>{if(msg.type()==='error'&&!/WebSocket|net::ERR|Failed to load resource/.test(msg.text()))errors.push(msg.text())})
 const navigate=async suffix=>{
  await page.evaluate(suffix=>{const a=[...document.querySelectorAll('a')].find(a=>decodeURIComponent(a.pathname)===suffix);if(!a)throw new Error('Link missing '+suffix);a.click()},suffix)
  await page.waitForFunction(suffix=>decodeURIComponent(location.pathname)===suffix,{},suffix)
  try { await page.waitForSelector('.store-breadcrumbs', {timeout:10000}) } catch(e) { console.log(errors,await page.$eval('body',el=>el.innerText.slice(0,2500)));throw e }
  await wait(700)
 }
 for(const width of [320,375,390,430,1440]){
  await page.setViewport({width,height:800})
  console.log('viewport',width)
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:60000})
  await page.waitForSelector('.category-circle-grid');await wait(1200)
  const grid=await page.$eval('.category-circle-grid',el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,links:[...el.querySelectorAll('a')].map(a=>decodeURIComponent(a.pathname))}))
  assert.equal(grid.columns,width<768?2:5)
  assert.equal(grid.links.length,3)
  assert.ok(!grid.links.some(href=>href.includes('اليومية')))
  await navigate('/categories/العناية')
  await page.waitForSelector('.category-circle-grid')
  assert.ok(await page.evaluate(()=>scrollY)<100)
  assert.equal(await page.$eval('.category-circle-grid',el=>el.querySelectorAll('a').length),1)
  assert.equal(await page.$eval('.collection-heading h1',el=>el.textContent),'منتجات هذا القسم')
  await page.click('#shop article [data-price-tag]')
  const count=await page.$eval('.header-bag > span',el=>el.textContent)
  await page.evaluate(()=>scrollTo({top:2000,behavior:'instant'}));await wait(700)
  const before=await page.evaluate(()=>scrollY)
  await navigate('/categories/العناية/العناية-اليومية')
  assert.ok(await page.evaluate(()=>scrollY)<100)
  assert.equal(await page.$('#shop article'),null)
  await navigate('/categories/العناية/العناية-اليومية/منتجات-يومية')
  assert.ok(await page.evaluate(()=>scrollY)<100)
  assert.equal(await page.$$eval('#shop article',els=>els.length),3)
  assert.ok(await page.$eval('.store-breadcrumbs',el=>el.textContent.includes('العناية اليومية')))
  await page.click('.filter-open');await page.waitForSelector('.filter-dialog[open]')
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden')
  await page.keyboard.press('Escape');await wait(100)
  assert.equal(await page.$('.filter-dialog[open]'),null)
  await page.goBack();await wait(700)
  await page.goBack();await wait(900)
  const restored=await page.evaluate(()=>scrollY)
  assert.ok(Math.abs(restored-before)<40,`width ${width}: restore ${restored} expected ${before}`)
  await page.goForward();await wait(500)
  assert.equal(await page.$eval('.header-bag > span',el=>el.textContent),count)
  assert.equal(await page.$$eval('.shop-header',els=>els.length),1)
  assert.equal(await page.$$eval('.mobile-shopping-bar',els=>els.length),1)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  console.log(`PASS ${width}: main-only grid, recursive navigation, direct/leaf products, filters, header, cart, back/forward, overflow`)
  await page.evaluate(()=>localStorage.clear())
 }
 assert.deepEqual(errors,[])
} finally {await browser.close()}
