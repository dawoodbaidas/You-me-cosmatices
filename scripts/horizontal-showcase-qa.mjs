import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {default:puppeteer}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js').href)
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try {
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message))
 for(const width of [320,390,1440]) {
  await p.setViewport({width,height:844});await p.goto('http://localhost:3010',{waitUntil:'networkidle0'});await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await new Promise(r=>setTimeout(r,2600))
  assert.notEqual(await p.$eval('.editorial-hero',e=>getComputedStyle(e).display),'none')
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width)
  await p.screenshot({path:`artifacts/phase1/showcase-hero-${width}.png`})
  for(const progress of [0,.4,1]) {
   await p.evaluate(q=>{const e=document.getElementById('bestsellers');window.scrollTo({top:e.offsetTop+(e.offsetHeight-innerHeight)*q,behavior:'instant'})},progress);await new Promise(r=>setTimeout(r,500))
   assert.ok(Math.abs(await p.$eval('.showcase-pin',e=>e.getBoundingClientRect().top))<2)
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width)
   await p.screenshot({path:`artifacts/phase1/showcase-${width}-${progress}.png`})
  }
  await p.evaluate(()=>document.querySelectorAll('.showcase-dots button')[2].click());await new Promise(r=>setTimeout(r,1700))
  assert.equal(await p.evaluate(()=>Array.from(document.querySelectorAll('.showcase-dots button')).findIndex(e=>e.getAttribute('aria-current')==='true')),2)
 }
 await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await p.reload({waitUntil:'networkidle0'});assert.equal(await p.$eval('.showcase-pin',e=>getComputedStyle(e).position),'relative')
 assert.equal(await p.$$eval('.showcase-slide',es=>es.filter(e=>getComputedStyle(e.querySelector('.showcase-copy')).opacity==='1').length),6)
 assert.deepEqual(errors,[]);console.log('Hero, three scroll states, navigation dots, reduced motion, sticky and overflow passed')
} finally {await browser.close()}
