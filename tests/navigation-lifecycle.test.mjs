import test from 'node:test'
import assert from 'node:assert/strict'
import {modules} from './helpers/load-app.mjs'

test('route-aware links report only actual non-cancelled client navigations', () => {
  const begun=[]
  const load=modules({
    react:{createContext:()=>({}),useContext:()=>({begin:href=>begun.push(href)})},
    'next/link':{__esModule:true,default:'a'},
    'next/navigation':{usePathname:()=>'/'} ,
  })
  const Link=load('@/components/StoreNavigation').default
  Link({href:'/categories'}).props.onNavigate({preventDefault(){throw Error('unexpected')}})
  assert.deepEqual(begun,['/categories'])
  let prevented=false
  Link({href:'/products/known',onNavigate:e=>e.preventDefault()}).props.onNavigate({preventDefault(){prevented=true}})
  assert.equal(prevented,true)
  assert.deepEqual(begun,['/categories'],'opening an in-place product overlay must not hide the listing')
})

test('product overlays preserve server query identity through open, close and history', () => {
  const saved=Object.fromEntries(['window'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  const listeners=new Map(),calls=[]
  const location=new URL('https://store.test/category/all?sort=price-asc')
  const history={state:{},pushState(state,_,url){this.state=state;location.href=url;calls.push('push')},replaceState(state,_,url){this.state=state;location.href=url;calls.push('replace')},back(){calls.push('back')}}
  try {
    globalThis.window={location,history,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),dispatchEvent:event=>listeners.get(event.type)?.()}
    const load=modules({react:{useSyncExternalStore:(subscribe,snapshot)=>{subscribe(()=>{});return snapshot()}}})
    const {useProductOverlay}=load('@/components/useProductOverlay')
    const overlay=useProductOverlay()
    overlay.open('a product')
    assert.equal(location.search,'?sort=price-asc')
    assert.equal(new URLSearchParams(location.hash.slice(1)).get('product'),'a product')
    assert.equal(useProductOverlay().slug,'a product')
    overlay.close()
    assert.deepEqual(calls,['push','back'])
    assert.ok(listeners.has('popstate'))
  }finally{if(saved.window)Object.defineProperty(globalThis,'window',saved.window);else delete globalThis.window}
})

test('scene teardown prevents queued observers or an already dispatched RAF from restarting animation', () => {
  const keys=['window','document','matchMedia','IntersectionObserver','ResizeObserver','requestAnimationFrame','cancelAnimationFrame']
  const saved=Object.fromEntries(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  const callbacks=[],frames=new Map(),disconnected=[]
  let cleanup,count=0,draws=0
  class Observer{constructor(callback){callbacks.push(callback)}observe(){}disconnect(){disconnected.push(this)}}
  const element={addEventListener(){},removeEventListener(){},querySelector(){return null},getBoundingClientRect(){return {top:0}},offsetHeight:900,clientWidth:390}
  try{
    Object.assign(globalThis,{window:{addEventListener(){},removeEventListener(){}},document:{hidden:false,addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),IntersectionObserver:Observer,ResizeObserver:Observer,requestAnimationFrame:fn=>{frames.set(++count,fn);return count},cancelAnimationFrame:id=>frames.delete(id)})
    const load=modules({react:{useEffect:fn=>{const result=fn();if(result)cleanup=result},useEffectEvent:fn=>fn,useRef:value=>({current:value}),useCallback:fn=>fn}})
    load('@/components/useSceneFrame').useSceneFrame({current:element},()=>draws++,true)
    const dispatched=frames.get(1)
    cleanup()
    callbacks[0]([{isIntersecting:true}]);callbacks[1]()
    dispatched(100)
    assert.equal(draws,0)
    assert.equal(frames.size,0)
    assert.equal(disconnected.length,2)
  }finally{for(const key of keys){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key]}}
})
