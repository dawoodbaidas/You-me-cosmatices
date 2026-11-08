import test from 'node:test'
import assert from 'node:assert/strict'
import { modules } from './helpers/load-app.mjs'

test('page skeletons wait 300ms and only appear on home/category routes', () => {
  const original = globalThis.setTimeout
  let ready = false, timer
  globalThis.setTimeout = (fn, delay) => { assert.equal(delay, 300); timer = fn; return 1 }
  try {
    const load = modules({
      react: { useState: () => [ready, value => { ready = value }], useEffect: fn => fn() },
      'next/navigation': { usePathname: () => '/' },
    })
    const Loading = load('@/components/DelayedStoreLoading').default
    for (const path of ['/', '/categories', '/categories/care', '/category/all', '/products/mist', '/cart', '/favorites']) {
      ready = false
      const component = Loading({ path })
      const render = () => component.type(component.props)
      assert.equal(render().props.children, false)
      timer()
      const content = render().props.children
      if (path.startsWith('/products') || path === '/cart' || path === '/favorites') assert.equal(content.type, 'p')
      else assert.equal(content.type, load('@/components/CategorySkeleton').default)
    }
  } finally { globalThis.setTimeout = original }
})

test('fresh route navigation resets scroll before replacing content; history preserves restoration', () => {
  const keys=['window','location','history','document','sessionStorage']
  const originals=Object.fromEntries(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  const events = [], listeners = new Map()
  globalThis.window = { scrollTo: options => events.push(['scroll', options.top]), dispatchEvent() {}, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener() {}, location: { pathname: '/categories' } }
  globalThis.location={href:'http://store.local/',pathname:'/',search:''}
  globalThis.history={state:{},replaceState(state){this.state=state},scrollRestoration:'auto'}
  globalThis.document={getElementById:()=>null}
  globalThis.sessionStorage={setItem(){}}
  window.scrollY=640
  try {
    const load = modules({
      react: { createContext: () => ({ Provider: 'provider' }), useRef:value=>({current:value}),useLayoutEffect(){}, useState: () => [{ pathname: '/', to: null }, value => events.push(['intent', value.to])], useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => fn() },
      'next/navigation': { usePathname: () => '/', useRouter: () => ({ push() {} }) },
    })
    const provider = load('@/components/StoreNavigation').StoreNavigation({ children: null })
    provider.props.value.begin('/categories')
    assert.deepEqual(events, [['scroll', 0], ['intent', '/categories']])
    assert.equal(history.state.storeScroll.y,640,'save the departing page before resetting scroll')
    events.length = 0
    listeners.get('popstate')()
    assert.deepEqual(events, [['intent', '/categories']])
  } finally { for(const key of keys){if(originals[key])Object.defineProperty(globalThis,key,originals[key]);else delete globalThis[key]} }
})
