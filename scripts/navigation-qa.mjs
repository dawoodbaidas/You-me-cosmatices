import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {mkdir} from 'node:fs/promises'
const {default:p}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const browser=await p.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
await mkdir('artifacts/navigation',{recursive:true})
try {
 for(const width of [390,1440]){
 const page=await browser.newPage();await page.setViewport({width,height:1000})
 const go=async route=>{await page.goto('http://localhost:3001'+route,{waitUntil:'networkidle0'});await page.waitForSelector('.shop-header')}
 const check=async()=>{await new Promise(r=>setTimeout(r,600));assert.equal(await page.$$eval('.shop-header',e=>e.length),1);assert.equal(await page.$('.home-category-strip'),null);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 await go('/');await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle0'});await check()
 await page.evaluate(()=>{window.__header=document.querySelector('.shop-header')})
 const href=await page.$eval('.category-circle-link',e=>e.getAttribute('href'))
 await page.$eval('.category-circle-link',e=>e.click())
 await page.waitForSelector('[data-testid^="product-"]')
 await check()
 assert.equal(await page.evaluate(()=>window.__header===document.querySelector('.shop-header')),true)
 await page.$eval('[data-testid^="product-"] button[aria-busy]',e=>e.click())
 await page.waitForSelector('[data-testid^="product-"] [class*="counter"]')
 await page.$eval('[data-testid^="product-"] button[aria-pressed]',e=>e.click())
 const saved=await page.evaluate(()=>({cart:localStorage.getItem('you-and-me-cart-v1'),favorites:localStorage.getItem('you-and-me-favorites-v1')}))
 await page.$eval('[data-testid^="product-"] h3 a',e=>e.click())
 await page.waitForSelector('.store-product-page')
 assert.ok(page.url().includes('/products/'));await check()
 assert.equal(await page.evaluate(()=>window.__header===document.querySelector('.shop-header')),true)
 await page.goBack({waitUntil:'networkidle0'});assert.ok(page.url().endsWith(href))
 await page.goForward({waitUntil:'networkidle0'});await page.waitForSelector('.store-product-page')
 if(width<768)await page.click('.menu-trigger');else await page.click('.mega-anchor > button')
 const nav=width<768?'.shopping-menu':'.shop-mega'
 const next=await page.$$eval(nav+' a[href^="/category/"]',(links,current)=>links.find(a=>a.getAttribute('href')!==current)?.getAttribute('href'),href)
 await page.$eval(nav+' a[href="'+next+'"]',e=>e.click())
 await page.waitForSelector('.catalogue-page')
 assert.equal(await page.$('dialog[open].menu-dialog'),null)
 await page.$eval('.world-brand',e=>e.click());await page.waitForSelector('.category-circles')
 assert.ok(page.url().endsWith('/'));await check()
 await go(href);await page.reload({waitUntil:'networkidle0'});await check()
 assert.deepEqual(await page.evaluate(()=>({cart:localStorage.getItem('you-and-me-cart-v1'),favorites:localStorage.getItem('you-and-me-favorites-v1')})),saved)
 await go('/favorites');assert.ok(await page.$('[data-testid^="product-"]'));await check()
 await go('/cart');assert.ok(await page.$('.cart-line'));await check()
 await page.screenshot({path:'artifacts/navigation/cart-'+width+'.png'})
 await go('/category/all')
 await page.waitForSelector('[data-testid^="product-"]')
 await page.evaluate(()=>scrollTo({top:500,behavior:"instant"}))
 assert.ok(Math.abs(await page.$eval('.shop-header',e=>e.getBoundingClientRect().top))<2)
 await page.screenshot({path:'artifacts/navigation/category-'+width+'.png'})
 await go('/categories');await check()
 await page.screenshot({path:'artifacts/navigation/categories-'+width+'.png'})
 const response=await page.goto('http://localhost:3001/category/does-not-exist-qa',{waitUntil:'networkidle0'})
 assert.ok(response.status()===404 || await page.$eval('body',e=>/404/.test(e.textContent)))
 console.log('PASS journey, shared header, history, reload, cart, favorites, 404',width)
 await page.close()
 }
}finally{await browser.close()}
