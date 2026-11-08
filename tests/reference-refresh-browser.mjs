import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
const {default:puppeteer}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const origin=process.argv[2],directory='artifacts/reference-refresh'
assert.ok(origin)
await mkdir(directory,{recursive:true})
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results=[]
try {
 for(const width of [320,390,430,768,1440]) {
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[]
  page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)})
  if(process.env.NAV_ONLY)page.on('console',m=>{if(m.text().startsWith('NAV'))console.log(m.text())})
  await page.setViewport({width,height:900})
  await page.goto(origin,{waitUntil:'networkidle0'})
  await page.waitForSelector('[data-hero-product]:not([inert])',{timeout:60000})
  await page.screenshot({path:`${directory}/home-${width}.png`})
  const hero=[]
  for(const offset of (process.env.NAV_ONLY?[]:[0,220])) {
   await page.evaluate(y=>scrollTo(0,y),offset)
   await new Promise(r=>setTimeout(r,500))
   const products=await page.$$eval('[data-hero-product]:not([inert])',els=>els.map(el=>el.dataset.heroProduct))
   for(const id of products) {
    await page.waitForSelector(`[data-hero-product="${id}"]:not([inert])`)
    await new Promise(r=>setTimeout(r,400))
    const point=await page.$eval(`[data-hero-product="${id}"] [data-hero-hit]`,el=>{const r=el.getBoundingClientRect();return {x:Math.max(1,Math.min(innerWidth-1,r.x+r.width/2)),y:Math.max(1,Math.min(innerHeight-1,r.y+r.height/2))}})
    console.log('hero click',width,offset,id,point,await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.outerHTML.slice(0,250),point))
    await page.mouse.click(point.x,point.y)
    await page.waitForSelector('.product-details-dialog[open]')
    assert.equal(await page.$eval('[data-testid="product-quickview"]',el=>el.dataset.productId),id,'Hero click opens its own product')
    await page.keyboard.press('Escape')
    await page.waitForSelector('.product-details-dialog[open]',{hidden:true})
    hero.push({offset,id})
   }
  }
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight))
  await new Promise(r=>setTimeout(r,400))
  const oldY=await page.evaluate(()=>scrollY)
  await page.mouse.click(width-5,880)
  console.log('before navigation',await page.evaluate(()=>({y:scrollY,state:history.state})))
  const category=await page.$eval('a[href^="/categories/"]',a=>a.getAttribute('href'))
  await page.evaluate(href=>document.querySelector(`a[href="${href}"]`).click(),category)
  await page.waitForFunction(path=>location.pathname===path,{},category)
  await page.waitForFunction(path=>[...document.querySelectorAll('[data-store-route]')].some(el=>el.getAttribute('data-store-route')===path),{},category)
  await page.waitForFunction(()=>scrollY<5)
  await page.goBack({waitUntil:'networkidle0'})
  console.log('after back',oldY,await page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight,route:document.querySelector('[data-store-route]')?.dataset,state:history.state})))
  await page.waitForFunction(y=>Math.abs(scrollY-y)<5,{},oldY)
  await page.goto(origin+'/category/all',{waitUntil:'networkidle0'})
  await page.waitForSelector('#shop article')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow')
  const card=await page.$('#shop article:not(:has(select)):has(button[aria-live]:not(:disabled))')
  assert.ok(card)
  const add=await card.$('button[aria-live]')
  await add.click()
  await page.waitForFunction(b=>b.textContent.includes('تمت الإضافة'),{},add)
  await page.waitForFunction(b=>b.textContent.includes('أضف إلى السلة'),{},add)
  await page.screenshot({path:`${directory}/products-${width}.png`})
  const before=await page.evaluate(()=>scrollY)
  await (await card.$('h3 a')).click()
  await page.waitForSelector('.product-details-dialog[open]')
  await page.screenshot({path:`${directory}/detail-${width}.png`})
  await page.click('[data-testid="product-add"]')
  await page.waitForFunction(()=>document.querySelector('[data-testid="product-add"]').textContent.includes('تمت الإضافة'))
  await page.waitForFunction(()=>document.querySelector('[data-testid="product-add"]').textContent.includes('أضف إلى السلة'))
  await page.keyboard.press('Escape')
  await page.waitForSelector('.product-details-dialog[open]',{hidden:true})
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<5,'Preview preserves scroll')
  const footers=[]
  for(const route of ['/',category,'/cart','/category/all']) {
   await page.goto(origin+route,{waitUntil:'networkidle0'})
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight))
   await new Promise(r=>setTimeout(r,200))
   assert.equal(await page.$$eval('footer',els=>els.length),1)
   const footer=await page.$('footer');await footer.screenshot({path:`${directory}/footer-${width}-${footers.length}.png`})
   footers.push(await page.$eval('footer',el=>({height:el.offsetHeight,links:[...el.querySelectorAll('a')].map(a=>a.getAttribute('href'))})))
  }
  assert.ok(footers.every(f=>Math.abs(f.height-footers[0].height)<2),'Consistent footer height')
  assert.deepEqual(errors,[])
  results.push({width,hero,categoryBack:true,cartFeedback:true,previewScroll:true,footers,errors})
  await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2))
  console.log('PASS',width)
  await context.close()
 }
}finally{await browser.close()}
