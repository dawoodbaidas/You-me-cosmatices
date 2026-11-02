import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {default:puppeteer}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js').href)
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try {
 const page=await browser.newPage(), errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 for(const width of [320,390,768,1440]) {
  await page.setViewport({width,height:844,hasTouch:width<600,isMobile:width<600});await page.goto('http://localhost:3010',{waitUntil:'networkidle0'})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width)
  const expected=width<600?[2.15,2.75]:width<900?[2.35,3.05]:[2.55,3.35]
  assert.ok(Math.abs(await page.$eval('.hero-editorial',e=>e.offsetHeight/innerHeight)-expected[0])<.01)
  assert.ok(Math.abs(await page.$eval('#bestsellers',e=>e.offsetHeight/innerHeight)-expected[1])<.01)
  const heroPositions=[]
  for(const progress of [0,.5,1,.5,0]) {
   await page.evaluate(q=>{const e=document.getElementById('home');scrollTo({top:scrollY+e.getBoundingClientRect().top+(e.offsetHeight-innerHeight)*q,behavior:'instant'})},progress)
   await new Promise(r=>setTimeout(r,80));heroPositions.push(await page.$eval('.editorial-central',e=>e.style.transform))
  }
  assert.notEqual(heroPositions[0],heroPositions[2]);assert.equal(heroPositions[0],heroPositions[4])
  const heroHold=[]
  for(const progress of [.46,.66]) {
   await page.evaluate(q=>{const e=document.getElementById('home');scrollTo({top:scrollY+e.getBoundingClientRect().top+(e.offsetHeight-innerHeight)*q,behavior:'instant'})},progress)
   await new Promise(r=>setTimeout(r,80));heroHold.push(await page.$$eval('.editorial-small',es=>es.map(e=>({transform:e.style.transform,opacity:e.style.opacity}))))
   if(progress===.46)await page.screenshot({path:`artifacts/phase1/hold-hero-${width}.png`})
  }
  assert.deepEqual(heroHold[0],heroHold[1]);assert.ok(heroHold[0].every(e=>+e.opacity===1))
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-palette]')].every(e=>e.dataset.palette))
  const palettes=await page.$$eval('[data-palette]',es=>es.map(e=>e.dataset.palette));assert.ok(new Set(palettes).size>1)
  const hold=[]
  for(const progress of [.16,.2,.24]) {
   await page.evaluate(q=>{const e=document.getElementById('bestsellers');scrollTo({top:scrollY+e.getBoundingClientRect().top+(e.offsetHeight-innerHeight)*q,behavior:'instant'})},progress)
   await new Promise(r=>setTimeout(r,80));hold.push(await page.$$eval('.semicircle-card',es=>es[1].style.transform))
  }
  assert.equal(hold[0],hold[1]);assert.equal(hold[1],hold[2])
  for(const progress of [0,.12,.2,.32,.4,.52,.6,.72,.8,.92,1,.6,.2,0]) {
   await page.evaluate(q=>{const e=document.getElementById('bestsellers');scrollTo({top:scrollY+e.getBoundingClientRect().top+(e.offsetHeight-innerHeight)*q,behavior:'instant'})},progress)
   await new Promise(r=>setTimeout(r,100))
   const state=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.semicircle-card')].filter(e=>parseFloat(getComputedStyle(e).opacity)>.15).map(e=>e.getBoundingClientRect().toJSON())
    const info=document.querySelector('.semicircle-info').getBoundingClientRect().toJSON()
    return {active:[...document.querySelectorAll('.semicircle-dots button')].findIndex(e=>e.getAttribute('aria-current')==='true'),cards,info,overflow:document.documentElement.scrollWidth}
   })
   assert.equal(state.active,Math.round(progress*5),`active at ${width}/${progress}`);assert.equal(state.overflow,width)
   const overlap=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1
   for(let i=0;i<state.cards.length;i++){assert.ok(!overlap(state.cards[i],state.info),`info overlap ${width}/${progress}`);for(let j=i+1;j<state.cards.length;j++)assert.ok(!overlap(state.cards[i],state.cards[j]),`card overlap ${width}/${progress}`)}
   if(progress===.4||progress===.52)await page.screenshot({path:`artifacts/phase1/refined-${width}-${progress}.png`})
  }
  await page.evaluate(()=>{const e=document.getElementById('bestsellers');scrollTo({top:scrollY+e.getBoundingClientRect().top+(e.offsetHeight-innerHeight)*.2,behavior:'instant'})})
  await new Promise(r=>setTimeout(r,100));const before=await page.evaluate(()=>scrollY)
  if(width<600) {
   const cdp=await page.createCDPSession();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width/2,y:650}]})
   for(const y of [630,610,590,570]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width/2,y}]});await new Promise(r=>setTimeout(r,50))}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()
  } else await page.mouse.wheel({deltaY:120})
  await new Promise(r=>setTimeout(r,350));assert.ok(await page.evaluate(()=>scrollY)>before,`natural input ${width}`)
  console.log(`PASS ${width}px: bidirectional progress, spacing, colors, overflow`)
 }
 await page.$$eval('.semicircle-dots button',es=>es[2].click());await page.waitForFunction(()=>document.querySelectorAll('.semicircle-dots button')[2].getAttribute('aria-current')==='true')
 await page.click('.semicircle-info button');assert.match(await page.$eval('.semicircle-info button',e=>e.textContent),/تمت الإضافة/)
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.reload({waitUntil:'networkidle0'})
 assert.equal(await page.$eval('.semicircle-pin',e=>getComputedStyle(e).position),'relative')
 await page.$$eval('.semicircle-dots button',es=>es[3].click());await new Promise(r=>setTimeout(r,100))
 assert.equal(await page.$$eval('.semicircle-dots button',es=>es.findIndex(e=>e.getAttribute('aria-current')==='true')),3)
 assert.deepEqual(errors,[]);console.log('PASS reduced motion, keyboard controls and browser errors')
} finally {await browser.close()}
