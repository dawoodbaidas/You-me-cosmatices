import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
const {default:puppeteer}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const origin=process.argv[2],report=[]
await mkdir('artifacts/ux-feedback',{recursive:true})
try{
 for(const width of [320,360,390,430,1280]){
  const context=await browser.createBrowserContext(),page=await context.newPage();await page.setViewport({width,height:900})
  await page.goto(origin,{waitUntil:'networkidle0'})
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight))
  if(width<768){
   await page.click('.menu-trigger');await page.waitForSelector('.menu-dialog[open]')
   const menuWidth=await page.$eval('.menu-dialog',e=>e.getBoundingClientRect().width)
   assert.ok(menuWidth<=280&&menuWidth<=width*.8,`menu ${menuWidth}`)
   await page.screenshot({path:`artifacts/ux-feedback/menu-${width}.png`})
  }
  await page.evaluate(()=>{
   window.samples=[];const tick=()=>{window.samples.push({path:location.pathname,y:scrollY,skeleton:!!document.querySelector('.category-skeleton'),pending:!!document.querySelector('.store-route-pending')});if(window.samples.length<180)requestAnimationFrame(tick)};tick()
   const a=innerWidth<768?document.querySelector('.shopping-menu a[href="/categories"]'):document.querySelector('.world-desktop-nav a[href="/categories"]');a.click()
  })
  await page.waitForFunction(()=>location.pathname==='/categories'&&!document.querySelector('.store-route-pending'))
  const nav=await page.evaluate(()=>window.samples)
  assert.ok(nav.filter(s=>s.pending).every(s=>s.y<10),JSON.stringify(nav))
  assert.ok(await page.evaluate(()=>scrollY<10))
  await page.click('.nav-search');await page.waitForSelector('.search-dialog[open]')
  assert.equal(await page.$('.category-skeleton,[aria-label="جارٍ تحميل المنتجات"]'),null)
  await page.keyboard.press('Escape')
  await page.goto(origin+'/category/all',{waitUntil:'networkidle0'})
  assert.equal(await page.$('[aria-label="جارٍ تحميل المنتجات"]'),null)
  await page.click('#shop article [data-price-tag]')
  await page.waitForFunction(()=>document.querySelector('#shop article').innerText.includes('تمت الإضافة'))
  await page.waitForFunction(()=>document.querySelector('#shop article button[aria-live]').innerText.includes('أضف إلى السلة'))
  assert.equal(await page.$eval('#shop article button[aria-live]',e=>e.disabled),false)
  await page.click('#shop article button[aria-live]')
  await page.waitForFunction(()=>document.querySelector('.header-bag span')?.textContent==='2')
  assert.equal(await page.$eval('#shop article img',e=>getComputedStyle(e).objectFit),'cover')
  const sizes=await page.evaluate(()=>({sort:document.querySelector('.catalog-sort select').getBoundingClientRect().height,filter:document.querySelector('.filter-open').getBoundingClientRect().height}))
  assert.ok(Math.abs(sizes.sort-sizes.filter)<=1,JSON.stringify(sizes))
  await page.click('.filter-open');await page.waitForSelector('.filter-dialog[open]')
  await new Promise(resolve=>setTimeout(resolve,300))
  const icon=await page.$eval('.filter-sheet-head button svg',e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))
  assert.deepEqual(icon,{w:20,h:20})
  await page.screenshot({path:`artifacts/ux-feedback/filter-${width}.png`})
  await page.click('.filter-sheet-head button');await page.waitForSelector('.filter-dialog[open]',{hidden:true})
  await page.click('#shop article a');await page.waitForSelector('.quickview-dialog[open]')
  assert.equal(await page.$('.category-skeleton,[aria-label="جارٍ تحميل المنتجات"]'),null)
  await page.click('.quickview-buy');await page.waitForFunction(()=>document.querySelector('.quickview-buy').innerText.includes('تمت الإضافة'))
  await page.waitForFunction(()=>document.querySelector('.quickview-buy').innerText.includes('أضف إلى السلة'))
  await page.keyboard.press('Escape');await page.waitForSelector('.quickview-dialog[open]',{hidden:true})
  await page.screenshot({path:`artifacts/ux-feedback/products-${width}.png`})
  await page.click('.nav-search');await page.waitForSelector('.search-dialog[open]')
  assert.equal(await page.$('.category-skeleton,[aria-label="جارٍ تحميل المنتجات"]'),null)
  report.push({width,menu:width<768?'under 280px / 80vw':'desktop',navigationStartsAtTop:true,backgroundSkeleton:false,repeatAdd:true,controls:sizes,closeIcon:icon,imageFit:'cover'})
  console.log('PASS',width);await context.close()
 }
 await writeFile('artifacts/ux-feedback/report.json',JSON.stringify(report,null,2))
}finally{await browser.close()}
