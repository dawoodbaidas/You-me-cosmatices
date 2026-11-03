import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {default:p}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const b=await p.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try {
const page=await b.newPage()
for(const width of [360,390,430,768,1440]) {
await page.setViewport({width,height:900})
await page.goto('http://127.0.0.1:1608/category/all',{waitUntil:'domcontentloaded'})
await page.waitForFunction(()=>document.querySelector('.boutique').style.getPropertyValue('--header-height'))
assert.equal(await page.$eval('.shop-category-strip',e=>getComputedStyle(e).display==='none'),width>=768)
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
assert.equal(await page.$eval('.shop-category-strip a',e=>e.getAttribute('href')),'/category/all')
assert.equal(await page.$eval('.world-brand',e=>e.getAttribute('href')),'/')
assert.equal(await page.$eval('.world-brand img',e=>getComputedStyle(e).objectFit),'contain')
if(width<768){await page.$eval('.shop-category-strip a:nth-child(2)',e=>e.click());await page.waitForFunction(()=>location.pathname==='/category/perfumes');await page.waitForSelector('.shop-category-strip a[aria-current=page][href="/category/perfumes"]')}
await page.screenshot({path:`artifacts/header-categories/navigation-${width}.png`})
console.log('PASS',width)
}
}finally{await b.close()}

