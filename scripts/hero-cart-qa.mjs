import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {mkdir} from 'node:fs/promises'
const {default:p}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const b=await p.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{const page=await b.newPage();await mkdir('artifacts/hero-cart',{recursive:true});for(const width of [390,1440]){
 await page.setViewport({width,height:1000});await page.goto('http://127.0.0.1:5073',{waitUntil:'networkidle0'})
 await page.waitForSelector('#hero-title');await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}))
 const hero=await page.$eval('#home',e=>{const title=e.querySelector('h1'),r=e.getBoundingClientRect();return {height:r.height,font:parseFloat(getComputedStyle(title).fontSize),weight:getComputedStyle(title).fontWeight,image:e.querySelector('img')?.getBoundingClientRect().toJSON()}})
 assert.ok(hero.font>=36);assert.equal(hero.weight,'800');assert.ok(hero.height<1000);await page.screenshot({path:`artifacts/hero-cart/hero-${width}.png`})
 for(const side of ['left','right']){
 await page.$eval('.header-bag',(e,side)=>{e.style.position='fixed';e.style.left=side==='left'?'10px':'auto';e.style.right=side==='right'?'10px':'auto';e.style.top='20px';e.click()},side)
 await page.waitForSelector('.cart-dialog[open]');await new Promise(r=>setTimeout(r,250))
 const rect=await page.$eval('.cart-sheet',e=>e.getBoundingClientRect().toJSON())
 assert.ok(side==='left'?Math.abs(rect.left)<1:Math.abs(rect.right-width)<17)
 assert.equal(await page.$eval('.cart-dialog',e=>e.dataset.side),side)
 assert.equal(await page.$eval('.cart-dialog',e=>e.parentElement.parentElement===document.body),true)
 for(let i=0;i<5;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('.cart-dialog').contains(document.activeElement)),true)}
 await page.screenshot({path:`artifacts/hero-cart/cart-${side}-${width}.png`});await page.keyboard.press('Escape')
 assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('header-bag')),true)
 }
 await page.$$eval('[data-testid^="product-"] [class*="_add_"]',buttons=>buttons.slice(0,10).forEach(b=>b.click()))
 await page.$eval('.header-bag',e=>e.click());await page.waitForSelector('.cart-dialog[open]');await new Promise(r=>setTimeout(r,250))
 await page.$eval('.cart-content',e=>e.scrollTop=e.scrollHeight)
 assert.ok(await page.$eval('.cart-content',e=>e.scrollHeight>e.clientHeight))
 await page.screenshot({path:`artifacts/hero-cart/cart-long-${width}.png`});await page.keyboard.press('Escape')
 }console.log('PASS hero typography and bounds; physical left/right opening; portal; focus trap/restoration; empty and long carts at 390/1440')
}finally{await b.close()}
