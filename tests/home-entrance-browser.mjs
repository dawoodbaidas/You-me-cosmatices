// Production-mode Task 7 UI/performance gate, using real scenes and local fixtures.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { browserTestEnvironment, createBrowserWorkspace, removeBrowserWorkspace } from './helpers/browser-workspace.mjs'
import { launchBrowser, poll, pause } from './helpers/cdp-browser.mjs'

const project = resolve(import.meta.dirname, '..')
const directory = await createBrowserWorkspace(project)
const artifacts = join(project, 'artifacts/home-entrance')
const key = 'you-me:home-entrance:v1'
let server, browser
const environment = { ...browserTestEnvironment('http://127.0.0.1:9'), NODE_ENV: 'production' }
try {
  await mkdir(artifacts, { recursive: true })
  await writeFile(join(directory, 'src/app/(store)/layout.tsx'), `export const dynamic='force-dynamic';export default function Layout({children}:{children:React.ReactNode}){return children}`)
  await writeFile(join(directory, 'src/app/(store)/page.tsx'), `'use client'
import Link from 'next/link'
import Hero from '@/components/Hero'
import BestSellers from '@/components/BestSellers'
import HomeEntrance from '@/components/HomeEntrance'
import { mapProduct } from '@/lib/products/map'
const products=[mapProduct({id:'fixture',slug:'fixture',name_ar:'عطر الورد',name_en:'Rose',price:5,category:'care',category_label:'Care',is_active:true,description:null,old_price:null,badge:null,is_featured:false,sort_order:0,benefits:[],product_categories:[],product_variants:[],image_url:'/products/body-mist.webp'})]
const actions={currency:'JOD',onScrollTo:()=>{},onOpenDetails:()=>{},onAddToCart:()=>{}}
export default function Page(){return <><Link href="/categories" id="away">Categories</Link><Hero products={products} {...actions}/><HomeEntrance/><BestSellers products={products} {...actions}/></>}
`)
  await writeFile(join(directory, 'src/app/(store)/categories/page.tsx'), `import Link from 'next/link';export default function Page(){return <Link id="back" href="/">Home</Link>}`)
  const build = spawn(process.execPath, [join(project, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], { cwd: directory, env: environment, windowsHide: true, stdio: 'inherit' })
  assert.equal((await once(build, 'exit'))[0], 0, 'isolated production build')
  const probe = createServer()
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  const origin = `http://127.0.0.1:${port}`
  server = spawn(process.execPath, [join(project, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: directory, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout.on('data', data => process.stdout.write(data)); server.stderr.on('data', data => process.stderr.write(data))
  await poll(async () => (await fetch(origin)).ok)
  browser = await launchBrowser()
  const report = []
  for (const width of [390, 1440]) {
    const page = await browser.page(width)
    await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__qa={states:[],cls:0,lcp:0};
      if(window.name==='on')sessionStorage.removeItem('${key}');
      if(window.name==='off')sessionStorage.setItem('${key}','seen');
      new PerformanceObserver(list=>{for(const e of list.getEntries())window.__qa.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
      new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__qa.cls+=e.value}).observe({type:'layout-shift',buffered:true});
      new MutationObserver(list=>{for(const m of list)if(m.target.matches?.('[data-home-entrance]')&&m.attributeName==='data-state')window.__qa.states.push({state:m.target.dataset.state,time:performance.now()})}).observe(document,{subtree:true,attributes:true});
    ` })
    // Prime optimizer and browser image caches without asserting cold readiness.
    await page.navigate(origin + '/'); await pause(1800)
    await page.evaluate(`sessionStorage.removeItem('${key}')`)
    await page.call('Page.reload')
    await poll(() => page.evaluate(`document.querySelector('[data-home-entrance]')?.dataset.state==='playing'`))
    await pause(180)
    await page.screenshot(join(artifacts, `logo-${width}.png`))
    await pause(520)
    await page.screenshot(join(artifacts, `split-${width}.png`))
    await poll(() => page.evaluate(`document.querySelector('[data-home-entrance]')?.hidden`))
    const first = await page.evaluate('window.__qa')
    assert.equal(first.states.filter(event => event.state === 'playing').length, 1)
    assert.ok(first.cls < 0.01)
    await page.screenshot(join(artifacts, `revealed-${width}.png`))
    await page.click('#away'); await poll(() => page.evaluate(`location.pathname==='/categories' && !!document.querySelector('#back')`))
    await page.click('#back'); await poll(() => page.evaluate(`location.pathname==='/' && !!document.querySelector('[data-home-entrance]')`))
    await pause(600)
    assert.equal(await page.evaluate(`document.querySelector('[data-home-entrance]').hidden`), true, 'no internal replay')
    await page.evaluate(`sessionStorage.removeItem('${key}')`)
    await page.call('Page.reload')
    await poll(() => page.evaluate(`document.querySelector('[data-home-entrance]')?.dataset.state==='playing'`))
    await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    assert.equal(await page.evaluate(`document.querySelector('[data-home-entrance]').hidden`), true, 'interaction dismisses')
    await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await page.evaluate(`sessionStorage.removeItem('${key}')`)
    await page.navigate(origin + '/'); await pause(600)
    assert.equal(await page.evaluate(`window.__qa.states.some(event=>event.state==='playing')`), false)
    await page.call('Emulation.setEmulatedMedia', { features: [] })
    const samples = { on: [], off: [] }
    for (let run = 0; run < 5; run++) for (const mode of run % 2 ? ['on', 'off'] : ['off', 'on']) {
      await page.evaluate(`window.name=${JSON.stringify(mode)}`)
      await page.navigate(origin + '/'); await pause(1800)
      const sample = await page.evaluate('window.__qa')
      assert.ok(sample.cls < 0.01, 'no entrance layout shift')
      assert.equal(sample.states.some(event => event.state === 'playing'), mode === 'on')
      samples[mode].push(sample)
    }
    const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
    const on = median(samples.on.map(sample => sample.lcp)), off = median(samples.off.map(sample => sample.lcp))
    report.push({ width, first, samples, lcpMedian: { on, off, delta: on - off }, performanceGate: on <= off + Math.max(80, off * 0.1) })
    await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2))
    assert.ok(report.at(-1).performanceGate, 'entrance LCP must remain within fixture noise tolerance')
    await page.close()
  }
  console.log(JSON.stringify(report.map(({ width, lcpMedian, performanceGate }) => ({ width, lcpMedian, performanceGate }))))
} finally {
  if (browser) await browser.close()
  if (server && server.exitCode === null) { const kill = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); await once(kill, 'exit') }
  await removeBrowserWorkspace(directory)
}
