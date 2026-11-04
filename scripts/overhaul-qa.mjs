import {pathToFileURL} from 'node:url'
const {default:p}=await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))
const b=await p.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const base='http://localhost:3000'
let failures=0
function ok(m,c){ if(!c) failures++; console.log(`  ${c?'PASS':'FAIL'} ${m}`) }
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
try {
 const page=await b.newPage()
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})

 // 1) horizontal-overflow sweep
 for(const width of [320,360,375,390,430,768,1024,1440]){
  await page.setViewport({width,height:900})
  await page.goto(`${base}/category/all`,{waitUntil:'networkidle2',timeout:90000})
  await sleep(400)
  const {sw,iw} = await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth}))
  ok(`width ${width} no page overflow (scrollWidth=${sw}, innerWidth=${iw})`, sw<=iw)
 }

 // 2) cart flow with stepper
 await page.setViewport({width:390,height:900})
 await page.goto(`${base}/category/all`,{waitUntil:'networkidle2',timeout:90000})
 await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'networkidle2',timeout:90000})
 await sleep(500)
 ok('price tag button exists', !!await page.$('[data-price-tag]'))
 await page.$eval('[data-price-tag]',e=>e.click()); await sleep(400)
 // header-bag is a Link to /cart; the drawer opens from the floating cart bar
 await page.$eval('.mobile-shopping-bar button',e=>e.click())
 await page.waitForSelector('.cart-dialog[open]',{timeout:20000})
 ok('cart drawer opens', !!await page.$('.cart-dialog[open]'))
 const stepperButtons=await page.$$('.cart-dialog .quantity-stepper button')
 ok('stepper has +/− buttons', stepperButtons.length===2)
 await stepperButtons[0].click(); await sleep(200); await stepperButtons[0].click(); await sleep(200)
 const plus=await page.$eval('.cart-dialog .quantity-stepper span',e=>e.textContent)
 ok(`quantity increments (=${plus})`, plus==='3')
 const decOk=await page.$eval('.cart-dialog .quantity-stepper button[aria-label^="خفض"]',e=>e.disabled)
 ok('decrement enabled at qty>1', !decOk)
 await (await page.$$('.cart-dialog .quantity-stepper button'))[1].click(); await sleep(200)
 await (await page.$$('.cart-dialog .quantity-stepper button'))[1].click(); await sleep(250)
 const one=await page.$eval('.cart-dialog .quantity-stepper span',e=>e.textContent)
 ok(`quantity back to 1 (=${one})`, one==='1')
 const decDisabled=await page.$eval('.cart-dialog .quantity-stepper button[aria-label^="خفض"]',e=>e.disabled)
 ok('decrement disabled at qty=1', decDisabled)
 await page.screenshot({path:'artifacts/overhaul/cart-drawer-390.png'})
 await page.keyboard.press('Escape'); await sleep(300)
 const barVisible=await page.evaluate(()=>{const el=document.querySelector('.mobile-shopping-bar');return !!(el&&el.classList.contains('is-visible'))})
 ok('mobile cart bar visible again after closing drawer', barVisible)

 // 3) /cart page: bar must not duplicate checkout CTA
 await page.goto(`${base}/cart`,{waitUntil:'networkidle2',timeout:90000}); await sleep(300)
 const barHidden=await page.evaluate(()=>{const el=document.querySelector('.mobile-shopping-bar');return !el||!el.classList.contains('is-visible')})
 ok('mobile cart bar hidden on /cart page', barHidden)
 await page.screenshot({path:'artifacts/overhaul/cart-page-390.png'})

 // 4) product detail page mobile+desktop
 await page.setViewport({width:1440,height:1000})
 await page.goto(`${base}/category/all`,{waitUntil:'networkidle2',timeout:90000})
 const href=await page.evaluate(()=>{const a=document.querySelector('[data-testid^="product-"] [class*="_title_"] a, [data-testid^="product-"] h3 a, [data-testid^="product-"] h2 a');return a?a.getAttribute('href'):null})
 ok(`product link found (${href})`, !!href)
 if(href){
  await page.goto(`${base}${href}`,{waitUntil:'networkidle2',timeout:90000}); await sleep(300)
  ok('product page renders', !!await page.$('.store-product-page'))
  await page.screenshot({path:'artifacts/overhaul/product-1440.png'})
  await page.setViewport({width:390,height:900}); await sleep(400)
  await page.screenshot({path:'artifacts/overhaul/product-390.png'})
 }

 // 5) review screenshots
 await page.setViewport({width:1440,height:1000})
 await page.goto(`${base}/`,{waitUntil:'networkidle2',timeout:90000}); await sleep(1000)
 await page.screenshot({path:'artifacts/overhaul/home-1440.png'})
 await page.setViewport({width:390,height:900})
 await page.goto(`${base}/`,{waitUntil:'networkidle2',timeout:90000}); await sleep(1000)
 await page.screenshot({path:'artifacts/overhaul/home-390.png'})
 await page.setViewport({width:1440,height:1000})
 await page.goto(`${base}/category/all`,{waitUntil:'networkidle2',timeout:90000}); await sleep(600)
 await page.screenshot({path:'artifacts/overhaul/category-1440.png'})

 ok('no browser errors during run', errors.length===0); if(errors.length) console.log('   errors:',errors.slice(0,4).join(' | '))
} finally { await b.close() }
console.log(failures?`FAILURES: ${failures}`:'ALL CHECKS PASSED')
process.exit(failures?1:0)
