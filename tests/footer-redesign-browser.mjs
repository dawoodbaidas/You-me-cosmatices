import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
const {default:puppeteer}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const origin=process.argv[2],phase=process.argv[3]??'before'
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
await mkdir('artifacts/footer-redesign',{recursive:true})
const metrics=[]
try {
 for(const width of [320,360,390,430]){
  const page=await browser.newPage();await page.setViewport({width,height:1000,deviceScaleFactor:1})
  await page.goto(origin+'/category/all',{waitUntil:'networkidle0'})
  await page.waitForSelector('#shop article [data-price-tag]')
  await page.click('#shop article [data-price-tag]')
  await page.waitForFunction(()=>document.querySelector('.mobile-shopping-bar')?.classList.contains('is-visible'))
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}))
  await new Promise(r=>setTimeout(r,500))
  const data=await page.evaluate(()=>{
   const footer=document.querySelector('footer'),r=footer.getBoundingClientRect(),bar=document.querySelector('.mobile-shopping-bar').getBoundingClientRect()
   return {width:innerWidth,height:r.height,top:r.top,bottom:r.bottom,cartTop:bar.top,cartBottom:bar.bottom,gap:bar.top-r.bottom,overflow:document.documentElement.scrollWidth>innerWidth,links:[...footer.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')})),hasCircularLogo:!!footer.querySelector('img[src*="logo"],img[alt="You&Me Cosmetics"]')}
  })
  if(phase==='after'){
   assert.ok(data.gap>=0,JSON.stringify(data));assert.equal(data.overflow,false);assert.equal(data.hasCircularLogo,false)
   assert.ok(!data.links.some(a=>/\/admin|\/category|\/categories/.test(a.href)))
   assert.ok(await page.$eval('footer',e=>e.textContent.includes('COSMETICS')&&e.textContent.includes('حكايتنا')))
   const targets=await page.$$eval('footer a,footer summary',els=>els.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})))
   assert.ok(targets.every(r=>r.w>=44&&r.h>=44),JSON.stringify(targets))
  }
  await (await page.$('footer')).screenshot({path:`artifacts/footer-redesign/${phase}-${width}.png`})
  await page.screenshot({path:`artifacts/footer-redesign/${phase}-${width}-cart.png`})
  if(phase==='after') {
   await page.focus('footer summary');await page.keyboard.press('Enter')
   assert.ok(await page.$eval('footer details',e=>e.open))
   await page.keyboard.press('Enter');assert.equal(await page.$eval('footer details',e=>e.open),false)
  }
  metrics.push(data);console.log(JSON.stringify(data));await page.close()
 }
 await writeFile(`artifacts/footer-redesign/${phase}.json`,JSON.stringify(metrics,null,2))
}finally{await browser.close()}
