import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {mkdir,writeFile} from 'node:fs/promises'
const {default:p}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const b=await p.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results=[]
await mkdir('artifacts/category-responsive',{recursive:true})
try {
const page=await b.newPage()
for(const width of [390,768,1440,1920]){
await page.setViewport({width,height:1000})
for(const route of ['/','/category/all']){
await page.goto('http://localhost:3001'+route,{waitUntil:'networkidle0'})
await page.waitForSelector(route==='/'?'.category-orb':'[data-testid^="product-"]')
await page.evaluate(()=>document.querySelector('#shop').scrollIntoView({behavior:'instant'}))
await new Promise(r=>setTimeout(r,1000))
const result=await page.evaluate((home)=>{
const grid=home?document.querySelector('.category-circle-grid'):document.querySelector('[data-testid^="product-"]').parentElement
const imgs=[...grid.querySelectorAll('img')]
return {columns:home?[...grid.children].filter(e=>Math.abs(e.getBoundingClientRect().top-grid.firstElementChild.getBoundingClientRect().top)<2).length:getComputedStyle(grid).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth>innerWidth,allLink:home&&!!grid.querySelector('[href="/category/all"]'),homeCards:home&&!!document.querySelector('[data-testid^="product-"]'),imageFits:imgs.every(i=>getComputedStyle(i).objectFit==='contain'),widths:[...grid.children].map(e=>Math.round(e.getBoundingClientRect().width))}
},route==='/')
results.push({width,route,...result})
assert.equal(result.columns,route==='/'?(width<768?3:4):(width<768?2:width<1024?3:width<1600?4:5))
assert.equal(result.overflow,false)
assert.equal(result.allLink,false)
assert.equal(result.homeCards,false)
assert.equal(result.imageFits,true)
await page.screenshot({path:'artifacts/category-responsive/'+width+(route==='/'?'-home':'-category')+'.png'})
console.log('PASS',width,route,JSON.stringify(result))
}}
await page.goto('http://localhost:3001/category/all',{waitUntil:'networkidle0'})
const card=await page.waitForSelector('[data-testid^="product-"]')
await card.evaluate(e=>e.scrollIntoView())
const add=await card.$('button[aria-busy]')
await add.click()
await page.waitForFunction(()=>document.querySelector('[data-testid^="product-"] button[aria-busy]').textContent.includes('\u2713'))
const quantity=await card.$('[class*="counter"] span')
assert.ok(Number(await quantity.evaluate(e=>e.textContent))>0)
const minus=await card.$('[class*="counter"] button')
await minus.click()
await page.waitForFunction(()=>!document.querySelector('[data-testid^="product-"] [class*="counter"]'))
console.log('PASS add, success, quantity and remove to zero')
await writeFile('artifacts/category-responsive/results.json',JSON.stringify(results,null,2))
}finally{await b.close()}

