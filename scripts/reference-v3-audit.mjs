import puppeteer from 'file:///C:/Users/ONE%20BY%20ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
import {mkdir,writeFile} from 'node:fs/promises'
const dir='artifacts/v3-reference'
await mkdir(dir,{recursive:true})
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results=[]
try {
for(const [name,url] of [['site123','https://6ae3a2fc07941.site123.me/'],['current','https://you-and-me-cosmetics.netlify.app/']]){
 const page=await browser.newPage()
 const blocked=[]
 await page.setRequestInterception(true)
 page.on('request',r=>{if(/supabase\.(co|com)|\/api\/|\/rest\/v1\//i.test(r.url())){blocked.push(r.url().split('?')[0]);return r.abort()}return r.continue()})
 for(const width of [390,1440]){
 await page.setViewport({width,height:width===390?844:1000,deviceScaleFactor:1,isMobile:width===390,hasTouch:width===390})
 try{await page.goto(url,{waitUntil:'networkidle2',timeout:60000})}catch(error){results.push({name,width,error:error.message})}
 await new Promise(r=>setTimeout(r,1800))
 await page.screenshot({path:dir+'/'+name+'-'+width+'-hero.png'})
 await page.screenshot({path:dir+'/'+name+'-'+width+'-full.png',fullPage:true})
 const data=await page.evaluate(()=>({title:document.title,height:document.body.scrollHeight,headings:Array.from(document.querySelectorAll('h1,h2,h3')).map(x=>x.textContent?.trim()).slice(0,35),images:document.images.length}))
 results.push({name,width,...data,blockedCount:blocked.length})
 }
 await page.close()
}
await writeFile(dir+'/inspection.json',JSON.stringify(results,null,2))
console.log(JSON.stringify(results,null,2))
} finally {await browser.close()}

