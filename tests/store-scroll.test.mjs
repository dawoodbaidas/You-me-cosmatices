import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

test('catalogue wheel smoothing is desktop-only, respects reduced motion and leaves protected scenes and keyboard native', () => {
  const original = Object.fromEntries(['window','document','Element','matchMedia','getComputedStyle','scrollY','innerHeight'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  const listeners=new Map(),calls=[]
  let cleanup,change,home=false
  const media={matches:false,addEventListener:(_,fn)=>{change=fn},removeEventListener:()=>{}}
  class TestElement {parentElement=null;scrollHeight=100;clientHeight=100;closest(selector){return selector==='#shop'?shop:null}}
  const shop=new TestElement();shop.getBoundingClientRect=()=>({top:1000-globalThis.scrollY})
  try{
    Object.assign(globalThis,{
      Element:TestElement,scrollY:200,innerHeight:800,
      window:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),scrollTo:options=>calls.push(options)},
      document:{documentElement:{scrollHeight:5000},querySelector:()=>({getBoundingClientRect:()=>({height:150})}),getElementById:()=>home?{}:null},
      matchMedia:query=>{assert.ok(query.includes('prefers-reduced-motion: no-preference'));assert.ok(query.includes('pointer: fine'));assert.ok(query.includes('min-width: 1024px'));return media},
      getComputedStyle:()=>({overflowY:'visible'}),
    })
    const source=ts.transpileModule(readFileSync(new URL('../src/components/StoreScroll.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
    const loaded={exports:{}}
    new Function('require','module','exports',source)(()=>({useEffect:fn=>{cleanup=fn()}}),loaded,loaded.exports)
    loaded.exports.default()
    assert.equal(listeners.has('wheel'),false,'touch/reduced motion must not install a wheel interceptor')
    assert.equal(calls.length,0,'mobile setup must not write scroll position')
    media.matches=true;change()
    const element=new TestElement();element.parentElement=shop
    const event={target:element,cancelable:true,deltaX:0,deltaY:160,deltaMode:0,preventDefault(){this.prevented=true}}
    listeners.get('wheel')(event)
    assert.equal(event.prevented,true)
    assert.deepEqual(calls.at(-1),{top:336,behavior:'smooth'})
    listeners.get('wheel')({...event,deltaY:-160,prevented:false})
    assert.deepEqual(calls.at(-1),{top:64,behavior:'smooth'},'reversing direction must respond immediately')
    let keyboardPrevented=false
    listeners.get('keydown')({key:'PageDown',preventDefault:()=>{keyboardPrevented=true}})
    assert.equal(keyboardPrevented,false)
    assert.deepEqual(calls.at(-1),{top:200,behavior:'instant'})
    home=true
    const protectedEvent={...event,prevented:false}
    listeners.get('wheel')(protectedEvent)
    assert.equal(protectedEvent.prevented,false,'never intercept in or above the editorial scenes')
    home=false
    const zoom={...event,ctrlKey:true,prevented:false}
    listeners.get('wheel')(zoom)
    assert.equal(zoom.prevented,false)
    media.matches=false;change()
    assert.equal(listeners.has('wheel'),false,'switching to reduced motion removes the interceptor')
  }finally{
    cleanup?.()
    for(const[key,descriptor]of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
  }
})
