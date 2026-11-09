'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'

function pathOf(href: string) { return new URL(href, 'http://store.local').pathname.replace(/\/$/, '') || '/' }
const NavigationContext = createContext<{
  activePath: string
  begin: (href: string, restore?: boolean) => boolean
  push: (href: string) => void
} | null>(null)

export function StoreNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const pending=useRef<{path:string;y:number;hash:string}|null>(null)
  const stopRestoring=useRef<()=>void>(()=>{})
  const savePosition=useCallback(()=>{
    if(pending.current)return
    const scroll={url:location.pathname+location.search,y:window.scrollY,count:Number(document.getElementById('shop')?.dataset.visibleCount)||12}
    history.replaceState({...history.state,storeScroll:scroll},'')
  },[])
  const [intent, setIntent] = useState<{ pathname: string; to: string | null }>({ pathname, to: null })
  // Intent lasts only until a route commits. A completed intent must never
  // reactivate when Back later returns to its original source pathname.
  if (intent.pathname !== pathname) setIntent({ pathname, to: null })
  const begin = useCallback((href: string, restore = false) => {
    // Cold/warm proof: the span click→data-ready ends when the committed route
    // lands (useLayoutEffect below). Debug-only in development.
    if (process.env.NODE_ENV !== 'production' && !restore) try { performance.mark('store:nav-begin') } catch { }
    const target=new URL(href,location.href)
    if (!restore && pending.current?.path === target.pathname && target.pathname !== pathname) return false
    if(target.pathname===pathname){
      stopRestoring.current()
      pending.current=null
      setIntent({pathname,to:null})
      return true
    }
    stopRestoring.current()
    if(!restore)savePosition()
    const saved=restore?history.state?.storeScroll:null
    pending.current={path:target.pathname,y:saved?.url===target.pathname+target.search&&Number.isFinite(saved.y)?saved.y:0,hash:restore?'':target.hash}
    if(restore&&saved?.url===target.pathname+target.search)try{sessionStorage.setItem('store-return',JSON.stringify(saved))}catch{}
    window.dispatchEvent(new Event('store:navigate'))
    if (!restore && pathOf(href) !== pathOf(pathname)) window.scrollTo({ top: 0, behavior: 'instant' })
    setIntent({ pathname, to: pathOf(href) })
    return true
  }, [pathname,savePosition])
  useEffect(() => {
    const back = () => begin(window.location.pathname, true)
    window.addEventListener('popstate', back, true)
    return () => window.removeEventListener('popstate', back, true)
  }, [begin])
  useEffect(()=>{
    const previous=history.scrollRestoration
    history.scrollRestoration='manual'
    let frame=0
    const remember=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(savePosition)}
    savePosition()
    window.addEventListener('scroll',remember,{passive:true})
    window.addEventListener('pagehide',savePosition)
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',remember);window.removeEventListener('pagehide',savePosition);history.scrollRestoration=previous;stopRestoring.current()}
  },[savePosition])
  const activePath = intent.pathname === pathname ? intent.to ?? pathOf(pathname) : pathOf(pathname)
  const committedPath=useRef(pathname)
  useLayoutEffect(()=>{
    if(committedPath.current!==pathname){
      committedPath.current=pathname
      if (process.env.NODE_ENV !== 'production') try {
        performance.mark('store:data-ready')
        if (performance.getEntriesByName('store:nav-begin').length) performance.measure('store:navigate', 'store:nav-begin', 'store:data-ready')
      } catch { }
      const saved=history.state?.storeScroll
      if(pending.current?.path!==pathname&&saved?.url===location.pathname+location.search&&Number.isFinite(saved.y))pending.current={path:pathname,y:saved.y,hash:''}
    }
    const target=pending.current
    if(!target||target.path!==pathname)return
    const disconnect=()=>{observer.disconnect();mutation.disconnect();window.removeEventListener('pointerdown',stop);window.removeEventListener('wheel',stop);window.removeEventListener('keydown',stop)}
    const stop=()=>{disconnect();if(pending.current===target)pending.current=null}
    const restore=()=>{
      const route=document.querySelector<HTMLElement>('[data-store-route]')
      if(route?.dataset.storeRoute!==target.path)return
      const anchor=target.hash?document.getElementById(decodeURIComponent(target.hash.slice(1))):null
      if(anchor)anchor.scrollIntoView({behavior:'instant'})
      else window.scrollTo({top:Math.min(target.y,Math.max(0,document.documentElement.scrollHeight-innerHeight)),behavior:'instant'})
      if(anchor||document.documentElement.scrollHeight-innerHeight>=target.y-1)stop()
    }
    const observer=new ResizeObserver(restore)
    observer.observe(document.getElementById('store-content')??document.body)
    const mutation=new MutationObserver(restore)
    mutation.observe(document.getElementById('store-content')??document.body,{childList:true,subtree:true})
    for(const event of ['pointerdown','wheel','keydown'])window.addEventListener(event,stop,{once:true})
    stopRestoring.current=stop
    restore()
    return disconnect
  },[pathname,activePath])
  const value = useMemo(() => ({ activePath, begin, push: (href: string) => { if (begin(href)) router.push(href,{scroll:pathOf(href)===pathname}) } }), [activePath, begin, router,pathname])
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useStoreNavigation() {
  const value = useContext(NavigationContext)
  if (!value) throw new Error('Store navigation requires the store layout')
  return value
}

// Next calls onNavigate only for an actual same-origin client navigation, after
// modified clicks and cancellation have been handled. No global click guessing.
export default function StoreLink({ href, onNavigate, ...props }: ComponentProps<typeof Link>) {
  const navigation = useContext(NavigationContext)
  const pathname=usePathname()
  const target=typeof href==='string'?href:href.pathname??'/'
  return <Link {...props} scroll={props.scroll??(pathOf(target)===pathname)} href={href} onNavigate={event => {
    let prevented = false
    onNavigate?.({ preventDefault() { prevented = true; event.preventDefault() } })
    if (!prevented && navigation?.begin(typeof href === 'string' ? href : href.pathname ?? '/') === false) event.preventDefault()
  }} />
}
