import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {launchBrowser,pause,poll} from '../tests/helpers/cdp-browser.mjs'
const origin='http://127.0.0.1:5090',db=process.argv[2]
assert.match(db??'',/^http:\/\/127\.0\.0\.1:\d+$/)
const output='artifacts/performance/navigation-after'
await mkdir(output,{recursive:true})
const browser=await launchBrowser(),results=[],errors=[]
const cats=await fetch(db+'/rest/v1/store_categories').then(r=>r.json())
const path=slugs=>'/categories/'+slugs.map(slug=>encodeURIComponent(cats.find(c=>c.slug===slug).url_slug)).join('/')
try {
 for(const width of [390,1440]) {
  console.log('Navigation QA',width)
  await fetch(db+'/__test/product',{method:'POST',body:JSON.stringify({slug:'package-laverne-you-miracle',imageUrl:'/products/package-laverne-you-miracle.webp',price:12,stock:8})})
  const p=await browser.page(width),requests=new Map(),completed=[]
  const stop=browser.listen(e=>{
   if(e.sessionId!==p.sessionId)return
   if(e.method==='Runtime.exceptionThrown')errors.push(e.params.exceptionDetails.exception?.description??e.params.exceptionDetails.text)
   if(e.method==='Network.requestWillBeSent')requests.set(e.params.requestId,{url:e.params.request.url,type:e.params.type,prefetch:e.params.request.headers['Next-Router-Prefetch']})
   if(e.method==='Network.loadingFinished')completed.push(requests.get(e.params.requestId))
  })
  await p.call('Page.addScriptToEvaluateOnNewDocument',{source:`
   window.documentToken=crypto.randomUUID();window.sceneReads=0;window.detachedSceneReads=0;window.badFrames=[];
   const rect=Element.prototype.getBoundingClientRect;
   Element.prototype.getBoundingClientRect=function(){if(this.id==='home'||this.id==='bestsellers'){sceneReads++;if(!this.isConnected)detachedSceneReads++}return rect.call(this)};
   const check=()=>{const owner=document.querySelector('[data-store-route]')?.dataset.storeRoute;if(location.pathname!=='/'&&document.querySelector('#home'))badFrames.push({url:location.pathname,owner,hero:true});if(owner&&owner!==location.pathname)badFrames.push({url:location.pathname,owner});requestAnimationFrame(check)};requestAnimationFrame(check);`})
  const ready=async (route,mode)=>{
   await poll(()=>p.evaluate(`location.pathname===${JSON.stringify(route)}&&!!document.querySelector('[data-store-route="${route}"][data-store-mode="${mode}"]')&&!document.querySelector('.category-skeleton')`))
   if(route!=='/')assert.equal(await p.evaluate(`document.querySelectorAll('#home,#bestsellers,[data-hero-product]').length`),0)
  }
  const frames=()=>p.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`)
  const geometry=()=>p.evaluate(`(()=>{const e=document.querySelector('#home'),pin=e.querySelector('[data-scene-pin]'),product=e.querySelector('[data-hero-product]');return {width:e.clientWidth,pinHeight:pin.clientHeight,productWidth:getComputedStyle(product).width,productHeight:getComputedStyle(product).height}})()`)
  await p.navigate(origin+'/');await ready('/','home')
  await poll(()=>p.evaluate(`!!document.querySelector('#home img')?.naturalWidth`))
  await p.evaluate('document.fonts.ready');await frames()
  const token=await p.evaluate('documentToken'),initialGeometry=await geometry()
  const marqueeBefore=await p.evaluate(`document.querySelector('#home [data-marquee]').style.transform`)
  await pause(200)
  assert.notEqual(await p.evaluate(`document.querySelector('#home [data-marquee]').style.transform`),marqueeBefore,'homepage animation is running')
  await p.screenshot(`${output}/home-${width}.png`)

  // Hold a real destination response, rather than slowing product code.
  await p.call('Fetch.enable',{patterns:[{urlPattern:origin+'/categories*',requestStage:'Request'}]})
  await p.click('.world-desktop-nav a[href="/categories"]');await frames()
  assert.equal(await p.evaluate(`document.querySelectorAll('#home,#bestsellers,[data-hero-product]').length`),0,'homepage visuals unmount as soon as Categories is the destination')
  assert.equal(await p.evaluate(`document.querySelectorAll('main .category-skeleton').length`),1)
  const readsAfterExit=await p.evaluate('sceneReads')
  await pause(1000)
  assert.equal(await p.evaluate('sceneReads'),readsAfterExit,'no homepage RAF loop survives navigation')
  await p.screenshot(`${output}/pending-categories-${width}.png`)
  await p.call('Fetch.disable');await ready('/categories','categories')
  await p.screenshot(`${output}/categories-${width}.png`)

  await p.click(`main a[href="${path(['care'])}"]`);await ready(path(['care']),'category')
  await p.click(`main a[href="${path(['care','child'])}"]`);await ready(path(['care','child']),'category')
  await poll(()=>p.evaluate(`!!document.querySelector('[data-testid^="product-"] img')?.naturalWidth`))
  await p.click('[data-testid^="product-"] button[class*="imageButton"]')
  await poll(()=>p.evaluate(`!!document.querySelector('.quickview-dialog[open] img')?.naturalWidth`))
  assert.equal(await p.evaluate(`new URLSearchParams(location.hash.slice(1)).has('product')`),true)
  await p.screenshot(`${output}/product-overlay-${width}.png`)
  await p.evaluate('history.back()');await poll(()=>p.evaluate(`!document.querySelector('.quickview-dialog[open]')`))
  await p.evaluate('history.forward()');await poll(()=>p.evaluate(`!!document.querySelector('.quickview-dialog[open]')`))
  await p.click('.quickview-close');await poll(()=>p.evaluate(`!document.querySelector('.quickview-dialog[open]')&&!location.hash.includes('product=')`))

  // Reverse transition with a fresh router payload, held independently of data caching.
  const beforeRefresh=completed.length
  await fetch(db+'/__test/product',{method:'POST',body:JSON.stringify({slug:'package-laverne-you-miracle',price:width===390?31:32})})
  await p.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await poll(()=>completed.slice(beforeRefresh).some(r=>r?.url.includes('/categories/')&&r.url.includes('_rsc=')&&!r.prefetch))
  await p.call('Fetch.enable',{patterns:[{urlPattern:origin+'/?*',requestStage:'Request'}]})
  await p.click('.world-brand');await frames()
  assert.equal(await p.evaluate(`document.querySelectorAll('main [data-store-route]').length`),0,'previous category is absent during pending Home navigation')
  assert.equal(await p.evaluate(`document.querySelectorAll('main .category-skeleton').length`),1)
  await p.screenshot(`${output}/pending-home-${width}.png`)
  await p.call('Fetch.disable');await ready('/','home')
  await poll(()=>p.evaluate(`!!document.querySelector('#home img')?.naturalWidth`))
  await p.evaluate('document.fonts.ready');await frames()
  assert.deepEqual(await geometry(),initialGeometry,'homepage layout dimensions survive a route round trip')
  await p.evaluate(`document.querySelector('#bestsellers').scrollIntoView()`)
  await p.click('#bestsellers [class*="showcaseDots"] button:last-child')
  await poll(()=>p.evaluate(`document.querySelector('#bestsellers [class*="showcaseDots"] button:last-child').getAttribute('aria-current')==='true'`))
  await p.screenshot(`${output}/bestsellers-${width}.png`)
  await p.evaluate(`window.scrollTo({top:0,behavior:'instant'})`)

  // Repeated Back/Forward and superseded responses must not resurrect old pages.
  for(let i=0;i<3;i++){
   await p.evaluate('history.back()');await ready(path(['care','child']),'category')
   await p.evaluate('history.forward()');await ready('/','home')
  }
  await p.call('Fetch.enable',{patterns:[{urlPattern:origin+'/categories*',requestStage:'Request'}]})
  await p.click('.world-desktop-nav a[href="/categories"]');await frames()
  await p.click('.world-brand');await frames()
  await p.click('.world-desktop-nav a[href="/categories"]');await frames()
  assert.equal(await p.evaluate(`document.querySelectorAll('#home,#bestsellers').length`),0)
  await p.call('Fetch.disable');await ready('/categories','categories')
  assert.equal(await p.evaluate('documentToken'),token,'navigation never reloads the document')
  assert.equal(await p.evaluate('detachedSceneReads'),0)
  assert.deepEqual(await p.evaluate('badFrames'),[],'no frame shows content belonging to another route')
  await p.screenshot(`${output}/rapid-final-${width}.png`)

  // Direct product route, refresh and browser Back remain distinct from overlays.
  await p.navigate(origin+'/products/package-laverne-you-miracle');await ready('/products/package-laverne-you-miracle','product')
  assert.equal(await p.evaluate(`document.querySelectorAll('#home,#bestsellers').length`),0)
  await p.click('.world-brand');await ready('/','home')
  await p.evaluate('history.back()');await ready('/products/package-laverne-you-miracle','product')
  await p.screenshot(`${output}/product-route-${width}.png`)
  await p.evaluate('history.forward()');await ready('/','home')
  // Applied filter queries are router-owned, including after a revision refresh.
  await p.click('.world-desktop-nav a[href="/categories"]');await ready('/categories','categories')
  await p.click(`main a[href="${path(['care'])}"]`);await ready(path(['care']),'category')
  await p.click(`main a[href="${path(['care','child'])}"]`);await ready(path(['care','child']),'category')
  await p.evaluate(`const select=document.querySelector('.catalog-sort select');select.value='price-asc';select.dispatchEvent(new Event('change',{bubbles:true}))`)
  await poll(()=>p.evaluate(`new URLSearchParams(location.search).get('sort')==='price-asc'&&!document.querySelector('.category-skeleton')`))
  const beforeFilterRefresh=completed.length
  await fetch(db+'/__test/product',{method:'POST',body:JSON.stringify({slug:'package-laverne-you-miracle',price:width===390?33:34})})
  await p.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await poll(()=>completed.slice(beforeFilterRefresh).some(r=>r?.url.includes('sort=price-asc')&&r.url.includes('_rsc=')&&!r.prefetch))
  await p.click('.header-bag');await ready('/cart','cart')
  await p.evaluate('history.back()');await ready(path(['care','child']),'category')
  assert.equal(await p.evaluate(`new URLSearchParams(location.search).get('sort')`),'price-asc')
  await p.click('.world-brand');await ready('/','home')
  await p.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await p.click('.world-desktop-nav a[href="/categories"]');await ready('/categories','categories')
  await p.click('.world-brand');await ready('/','home')
  assert.deepEqual(await p.evaluate('badFrames'),[])
  assert.equal(await p.evaluate('detachedSceneReads'),0)
  results.push({width,delayedHomeToCategory:true,delayedCategoryToHome:true,overlayBackForward:true,routeBackForwardCycles:3,rapidSupersededNavigation:true,directProductBackForward:true,bestSellingScrollAnimation:true,filterRevisionBack:true,reducedMotion:true,noDocumentReload:true,staleFrames:0,detachedSceneReads:0,initialGeometry})
  stop();await p.close()
  await writeFile(`${output}/results.json`,JSON.stringify({results,errors},null,2))
 }
 assert.deepEqual(errors,[])
 console.log(JSON.stringify(results,null,2))
}finally{await browser.close()}
