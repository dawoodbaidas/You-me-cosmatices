import { mkdir, writeFile } from 'node:fs/promises'
import { launchBrowser, pause, poll } from '../tests/helpers/cdp-browser.mjs'
const origin='http://127.0.0.1:5090', database=process.argv[2]
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(database??''))throw Error('Isolated fixture required')
const output='artifacts/performance/navigation-before'
await mkdir(output,{recursive:true})
const browser=await launchBrowser(), results=[]
try {
 for(const width of [390,1440]) {
  const p=await browser.page(width), network=[], held=[]
  const stop=browser.listen(event=>{
   if(event.sessionId!==p.sessionId)return
   if(event.method==='Fetch.requestPaused')held.push(event.params.requestId)
   if(['Network.requestWillBeSent','Network.responseReceived','Network.loadingFailed'].includes(event.method)) {
    const q=event.params;network.push({event:event.method,id:q.requestId,url:q.request?.url??q.response?.url,status:q.response?.status,error:q.errorText})
   }
  })
  await p.call('Fetch.enable',{patterns:[{urlPattern:origin+'/categories*',requestStage:'Request'}]})
  await p.navigate(origin+'/')
  await poll(()=>p.evaluate(`!!document.querySelector('#home img')?.naturalWidth`))
  await p.evaluate(`window.framesSeen=[];window.track=true;const frame=()=>{framesSeen.push({t:performance.now(),url:location.pathname,hero:!!document.querySelector('#home'),skeleton:!!document.querySelector('.category-skeleton'),title:document.querySelector('main h1,main h2')?.textContent});if(track)requestAnimationFrame(frame)};requestAnimationFrame(frame)`)
  await p.click('.world-desktop-nav a[href="/categories"]')
  await pause(1500)
  const pending=await p.evaluate(`({url:location.pathname,hero:!!document.querySelector('#home'),heroImages:document.querySelectorAll('#home img').length,skeleton:!!document.querySelector('.category-skeleton')})`)
  await p.screenshot(`${output}/pending-categories-${width}.png`)
  await p.call('Fetch.disable')
  for(const requestId of held)await p.call('Fetch.continueRequest',{requestId}).catch(()=>{})
  await poll(()=>p.evaluate(`location.pathname==='/categories'&&!document.querySelector('.category-skeleton')`))
  await p.click('.world-brand')
  await poll(()=>p.evaluate(`location.pathname==='/'&&!!document.querySelector('#home')`))
  await p.evaluate('history.back()')
  await pause(1000)
  const backCategories=await p.evaluate(`({url:location.pathname,hero:!!document.querySelector('#home'),skeleton:!!document.querySelector('.category-skeleton'),heading:document.querySelector('main h1,main h2')?.textContent})`)
  await p.screenshot(`${output}/back-categories-${width}.png`)
  await p.navigate(origin+'/category/all')
  await poll(()=>p.evaluate(`!!document.querySelector('[data-testid^="product-"]')`))
  await p.click('[data-testid^="product-"] button[class*="imageButton"]')
  await poll(()=>p.evaluate(`!!document.querySelector('.quickview-dialog[open]')`))
  const modalHistory=await p.evaluate('history.state')
  await fetch(database+'/__test/product',{method:'POST',body:JSON.stringify({slug:'package-laverne-you-miracle',price:17})})
  await p.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await poll(()=>p.evaluate(`document.querySelector('.quickview-dialog[open]')?.textContent.includes('17.00')`))
  await p.click('.quickview-close')
  await poll(()=>p.evaluate(`!location.search.includes('product=')`))
  const beforeCartHistory=await p.evaluate('history.state')
  await p.click('.header-bag')
  await poll(()=>p.evaluate(`location.pathname==='/cart'&&!!document.querySelector('[data-testid="cart-page"]')`))
  const cartHistory=await p.evaluate('history.state')
  await p.evaluate('history.back()')
  await pause(5000)
  const historyResult=await p.evaluate(`({url:location.href,hero:!!document.querySelector('#home'),skeleton:!!document.querySelector('.category-skeleton'),products:document.querySelectorAll('[data-testid^="product-"]').length,history:history.state})`)
  await p.screenshot(`${output}/stuck-history-${width}.png`)
  await p.evaluate('window.track=false')
  const frames=await p.evaluate('window.framesSeen??[]')
  results.push({width,pending,backCategories,historyResult,modalHistory,beforeCartHistory,cartHistory,network,frames})
  await writeFile(`${output}/reproduction.json`,JSON.stringify(results,null,2))
  console.log(JSON.stringify({width,pending,backCategories,historyResult}))
  stop();await p.close()
 }
}finally{await browser.close()}
