import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {default:puppeteer}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{
 const p=await browser.newPage();await p.setViewport({width:390,height:844})
 await p.goto(process.argv[2],{waitUntil:'networkidle0'})
 await p.setRequestInterception(true)
 p.on('request',r=>{if(new URL(r.url()).pathname==='/categories'&&r.isNavigationRequest()===false)setTimeout(()=>r.continue().catch(()=>{}),1200);else void r.continue()})
 await p.evaluate(()=>{scrollTo(0,document.documentElement.scrollHeight);document.querySelector('.menu-trigger').click()})
 await p.waitForSelector('.menu-dialog[open]')
 await p.evaluate(()=>document.querySelector('.shopping-menu a[href="/categories"]').click())
 await p.waitForSelector('.store-route-pending')
 assert.equal(await p.$('.category-skeleton'),null)
 assert.ok(await p.evaluate(()=>scrollY<10))
 await p.waitForSelector('.category-skeleton')
 await p.screenshot({path:'artifacts/ux-feedback/delayed-categories.png'})
 await p.waitForFunction(()=>location.pathname==='/categories'&&!document.querySelector('.store-route-pending'))
 assert.ok(await p.evaluate(()=>scrollY<10))
 console.log('PASS slow category navigation: initial blank placeholder, delayed skeleton, top preserved, skeleton removed after load')
}finally{await browser.close()}
