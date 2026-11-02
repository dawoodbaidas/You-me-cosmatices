import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { writeFile } from 'node:fs/promises'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js').href)
const browser = await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const report=[]
try {
 const page=await browser.newPage()
 for (const width of [1024,1280,1440,1920]) {
  await page.setViewport({width,height:1000})
  await page.goto('http://localhost:3010',{waitUntil:'networkidle0'})
  await page.evaluate(()=>document.fonts.ready)
  await new Promise(r=>setTimeout(r,2500))
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'})
  for(const top of [0,180,360]) {
   await page.evaluate(top=>window.scrollTo({top,behavior:'instant'}),top)
   await new Promise(r=>setTimeout(r,1000))
   const evidence=await page.evaluate(()=>{
    const overlaps=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)
    const title=document.querySelector('.campaign-title').getBoundingClientRect()
    const note=document.querySelector('.campaign-note').getBoundingClientRect()
    const scene=document.querySelector('.desktop-campaign').getBoundingClientRect()
    return {overflow:document.documentElement.scrollWidth>innerWidth,title:document.querySelector('.campaign-title').textContent,images:Array.from(document.querySelectorAll('.campaign-photo')).map(el=>{
     const box=el.getBoundingClientRect(),img=el.querySelector('img'),css=getComputedStyle(img)
     return {name:img.alt,loaded:img.complete&&img.naturalWidth>0,fit:css.objectFit,padding:css.padding,collision:overlaps(box,title)||overlaps(box,note),inside:box.left>=scene.left&&box.right<=scene.right&&box.top>=scene.top&&box.bottom<=scene.bottom}
    })}
   })
   assert.equal(evidence.overflow,false)
   assert.equal(evidence.images.length,3)
   assert.ok(evidence.title.includes('كل ما يناسبك،'))
   for(const image of evidence.images) {assert.ok(image.loaded);assert.equal(image.fit,'cover');assert.equal(image.padding,'0px');assert.equal(image.collision,false,`${width}/${top} text collision: ${image.name}`);assert.ok(image.inside,`${width}/${top} outside scene`)}
   await page.screenshot({path:`artifacts/desktop-v5/inclusive-${width}-scroll-${top}.png`})
   report.push({width,top,...evidence})
  }
 }
 await writeFile('artifacts/desktop-v5/inclusive-hero-report.json',JSON.stringify(report,null,2))
 console.log('12 desktop hero states passed: imagery loaded, no text collisions, no frame padding, no overflow, contained motion.')
} finally {await browser.close()}
