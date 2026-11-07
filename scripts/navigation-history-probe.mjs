import {launchBrowser,poll,pause} from '../tests/helpers/cdp-browser.mjs'
const origin='http://127.0.0.1:5090',db=process.argv[2],browser=await launchBrowser()
try{for(const modal of [false,true]){
 const p=await browser.page(),requests=new Map(),completed=[]
 const stop=browser.listen(e=>{if(e.sessionId!==p.sessionId)return;if(e.method==='Network.requestWillBeSent')requests.set(e.params.requestId,{url:e.params.request.url,prefetch:e.params.request.headers['Next-Router-Prefetch']});if(e.method==='Network.loadingFinished')completed.push(requests.get(e.params.requestId))})
 await p.navigate(origin+'/category/all')
 if(modal){await p.click('[data-testid^="product-"] button[class*="imageButton"]');await poll(()=>p.evaluate(`!!document.querySelector('.quickview-dialog[open]')`))}
 const count=completed.length
 await fetch(db+'/__test/product',{method:'POST',body:JSON.stringify({slug:'package-laverne-you-miracle',price:modal?23:22})})
 await p.evaluate(`window.dispatchEvent(new Event('focus'))`)
 await poll(()=>completed.slice(count).some(r=>r?.url.includes('/category/all?')&&!r.prefetch))
 if(modal){await p.click('.quickview-close');await poll(()=>p.evaluate(`!document.querySelector('.quickview-dialog[open]')&&!location.search.includes('product=')&&!location.hash.includes('product=')`))}
 await p.click('.header-bag');await poll(()=>p.evaluate(`location.pathname==='/cart'&&!!document.querySelector('[data-testid="cart-page"]')`))
 await p.evaluate('history.back()');await pause(5000)
 console.log(JSON.stringify({modal,result:await p.evaluate(`(()=>{const el=document.querySelector('.category-skeleton');let f=el?.[Object.keys(el).find(k=>k.startsWith('__reactFiber'))];const chain=[];while(f){chain.push({type:typeof f.type==='function'?f.type.name:typeof f.type==='string'?f.type:String(f.type),route:f.memoizedProps?.routePath,mode:f.memoizedProps?.mode});f=f.return}return {url:location.href,skeleton:!!el,products:document.querySelectorAll('[data-testid^="product-"]').length,chain}})()`)}))
 stop();await p.close()
}}finally{await browser.close()}
