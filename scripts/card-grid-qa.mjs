import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {mkdir,writeFile} from 'node:fs/promises'
const {default:puppeteer}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results=[]
try {
 const page=await browser.newPage()
 await mkdir('artifacts/card-grid',{recursive:true})
 for(const route of ['/','/category/all','/category/care']) {
  await page.goto('http://127.0.0.1:5073'+route,{waitUntil:'networkidle0'})
  await page.waitForSelector('[data-testid^="product-"]')
  for(const width of [390,768,1199,1200,1440]) {
   await page.setViewport({width,height:1000})
   await page.evaluate(()=>document.querySelector('#shop').scrollIntoView({behavior:'instant'}))
   await new Promise(r=>setTimeout(r,1600))
   const result=await page.evaluate(()=>{
    const card=document.querySelector('[data-testid^="product-"]'),grid=card.parentElement,style=getComputedStyle(grid)
    const children=[...grid.children],rects=children.map(e=>e.getBoundingClientRect())
    return {display:style.display,columns:style.gridTemplateColumns,padding:style.paddingInline,gap:style.gap,maxWidth:style.maxWidth,gridWidth:grid.getBoundingClientRect().width,directCards:children.every(e=>e.matches('[data-testid^="product-"]')),firstRow:rects.filter(r=>Math.abs(r.top-rects[0].top)<2).length,cardWidth:rects[0].width,overflow:document.documentElement.scrollWidth>innerWidth,imageFit:getComputedStyle(card.querySelector('img')).objectFit}
   })
   results.push({route,width,...result})
   if(!process.argv.includes('--before')) {assert.equal(result.firstRow,width<768?1:width<1200?2:3);assert.equal(result.directCards,true);assert.equal(result.overflow,false);assert.equal(result.padding,'14px');assert.equal(result.gap,'40px 24px');assert.equal(result.imageFit,'cover')}
   if([390,1440].includes(width))await page.screenshot({path:`artifacts/card-grid/${route.replaceAll('/','-')}-${width}.png`})
  }
 }
 console.log(JSON.stringify(results,null,2))
 await writeFile('artifacts/card-grid/results.json',JSON.stringify(results,null,2))
} finally {await browser.close()}
