import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
const {default:puppeteer}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js').href)
await mkdir('artifacts/phase1',{recursive:true})
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const pause=ms=>new Promise(r=>setTimeout(r,ms))
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true})
 await page.goto('http://localhost:3010',{waitUntil:'networkidle0'});await pause(2000)
 await page.click('.menu-trigger');await page.waitForSelector('.menu-dialog[open]');await page.screenshot({path:'artifacts/phase1/mobile-menu.png'})
 await page.$eval('.shopping-group button[aria-label="عرض أقسام المكياج"]',el=>el.click())
 await page.screenshot({path:'artifacts/phase1/mobile-subcategories.png'})
 await page.evaluate(()=>Array.from(document.querySelectorAll('.shopping-subgroups button')).find(b=>b.textContent.includes('مسكارا')).click())
 await pause(1000);assert.equal(await page.$('.menu-dialog[open]'),null)
 assert.ok((await page.$eval('.collection-heading',e=>e.textContent)).includes('مسكارا'))
 assert.equal(await page.$$eval('.beauty-object',els=>els.length),2)
 await page.$eval('#catalog-search',e=>{e.value='';e.dispatchEvent(new Event('input',{bubbles:true}))})
 await page.type('#catalog-search','essence');await pause(200);assert.equal(await page.$$eval('.beauty-object',els=>els.length),1)
 await page.$eval('.clear-collection',e=>e.click());await pause(250)
 assert.equal(await page.$eval('.shop-count',e=>parseInt(e.textContent)),81)
 await page.$eval('.object-cart-v2',e=>e.click());await page.waitForFunction(()=>JSON.parse(localStorage.getItem('you-and-me-cart-v1')||'[]').length>0)
 await page.$eval('.mobile-shopping-bar button',e=>e.click());await page.waitForSelector('.cart-dialog[open]');await page.screenshot({path:'artifacts/phase1/mobile-cart.png'})
 await page.evaluate(()=>{window.__orderCount=0;window.open=(url)=>{window.__order=url;window.__orderCount++;return null}})
 await page.$eval('.cart-checkout',e=>{e.click();e.click()});assert.ok(await page.evaluate(()=>window.__order?.startsWith('https://wa.me/')));assert.equal(await page.evaluate(()=>window.__orderCount),1)
 assert.ok(await page.evaluate(()=>new URL(window.__order).searchParams.get('text').includes(document.querySelector('.cart-line h3').textContent)))
 await page.keyboard.press('Escape');await page.reload({waitUntil:'networkidle0'});assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('you-and-me-cart-v1')||'[]').length>0))
 for(const width of [360,375,390,430]){await page.setViewport({width,height:844,isMobile:true,hasTouch:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
 await page.setViewport({width:1440,height:900});await page.reload({waitUntil:'networkidle0'});await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));await pause(300);assert.ok(await page.$eval('.shop-header',e=>Math.abs(e.getBoundingClientRect().top)<2));await page.evaluate(()=>Array.from(document.querySelectorAll('.mega-anchor button')).find(b=>b.getAttribute('aria-controls')==='shop-mega').click());await page.waitForSelector('.shop-mega');await page.screenshot({path:'artifacts/phase1/desktop-mega.png'})
 await page.evaluate(()=>Array.from(document.querySelectorAll('.shop-mega button')).find(b=>b.textContent.includes('المحافظ')).click());await pause(1000);assert.ok((await page.$eval('.collection-heading',e=>e.textContent)).includes('الشنط والمحافظ'))
 for(const width of [1024,1440,1920]){await page.setViewport({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}assert.deepEqual(errors,[])
 console.log('Mobile menu, nested mascara filtering, search, clear, cart, WhatsApp URL, persistence, desktop mega and overflow checks passed')
} finally {await browser.close()}
