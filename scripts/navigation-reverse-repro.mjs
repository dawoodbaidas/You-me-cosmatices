import {writeFile} from 'node:fs/promises'
import {launchBrowser,pause,poll} from '../tests/helpers/cdp-browser.mjs'
const origin='http://127.0.0.1:5090',db=process.argv[2],browser=await launchBrowser(),results=[]
try{for(const width of [390,1440]){
 const p=await browser.page(width),events=[]
 const stop=browser.listen(e=>{if(e.sessionId===p.sessionId)events.push(e)})
 await p.navigate(origin+'/categories')
 await fetch(db+'/__test/product',{method:'POST',body:JSON.stringify({slug:'package-laverne-you-miracle',price:width===390?26:27})})
 await p.evaluate(`window.dispatchEvent(new Event('focus'))`)
 await poll(()=>events.some(e=>e.method==='Network.responseReceived'&&e.params.response.url.includes('/categories?_rsc')))
 await p.call('Fetch.enable',{patterns:[{urlPattern:origin+'/?*',requestStage:'Request'}]})
 await p.click('.world-brand');await pause(1500)
 const pending=await p.evaluate(`({url:location.pathname,hero:!!document.querySelector('#home'),skeleton:!!document.querySelector('.category-skeleton'),heading:document.querySelector('main h1,main h2')?.textContent})`)
 await p.screenshot(`artifacts/performance/navigation-before/pending-home-${width}.png`)
 results.push({width,pending});console.log({width,pending})
 await p.call('Fetch.disable');stop();await p.close()
}await writeFile('artifacts/performance/navigation-before/reverse.json',JSON.stringify(results,null,2))}finally{await browser.close()}
