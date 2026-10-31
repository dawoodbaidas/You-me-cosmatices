import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {default:puppeteer}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js').href)
const b=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try {
 const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message))
 await p.setViewport({width:320,height:844,isMobile:true,hasTouch:true});await p.goto('http://localhost:3010',{waitUntil:'networkidle0'});await p.evaluate(()=>localStorage.removeItem('you-and-me-cart-v1'));await p.reload({waitUntil:'networkidle0'})
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),320)
 assert.equal(await p.$eval('.mobile-shopping-bar',e=>e.getAttribute('aria-hidden')),'true')
 await p.$eval('.feature-mobile-add',e=>e.click());await p.waitForFunction(()=>document.querySelector('.mobile-shopping-bar').getAttribute('aria-hidden')==='false')
 assert.ok((await p.$eval('.feature-mobile-add',e=>e.textContent)).includes('تمت الإضافة'))
 await p.$eval('.mobile-shopping-bar button',e=>e.click());await p.waitForSelector('.cart-dialog[open]')
 assert.equal(await p.$eval('.mobile-shopping-bar',e=>e.getAttribute('aria-hidden')),'true')
 const text=await p.$eval('.cart-sheet',e=>e.innerText);assert.ok(text.includes('2.50 JOD'));assert.ok(text.includes('3.50 JOD'))
 await p.$eval('.quantity-stepper button',e=>e.click());await p.waitForSelector('.cart-empty');assert.ok((await p.$eval('.cart-empty',e=>e.innerText)).includes('سلتك فاضية'))
 await p.keyboard.press('Escape');assert.equal(await p.$eval('.mobile-shopping-bar',e=>e.getAttribute('aria-hidden')),'true')
 await p.$eval('.mobile-hero-pill button',e=>e.click());await p.$eval('.mobile-shopping-bar button',e=>e.click());await p.waitForSelector('.cart-dialog[open]')
 assert.ok((await p.$eval('.cart-sheet',e=>e.innerText)).includes('توصيلك مجاني'))
 assert.deepEqual(errors,[]);console.log('320px overflow, hero add, carousel add feedback, cart visibility, shipping totals, free delivery, quantity removal and dialog passed')
} finally {await b.close()}
