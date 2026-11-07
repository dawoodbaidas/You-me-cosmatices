// Isolated UI fixtures: never authenticates against or writes to the real store.
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
const artifacts = join(project, 'artifacts/admin-task6')
let server, browser
try {
  await mkdir(artifacts, { recursive: true })
  const pageDirectory = join(directory, 'src/app/admin-ux-qa')
  await mkdir(pageDirectory, { recursive: true })
  await writeFile(join(pageDirectory, 'page.tsx'), `'use client'
import { useState } from 'react'
import ProductManager from '@/components/admin/ProductManager'
import CategoryManager from '@/components/admin/CategoryManager'
import HomeSectionManager from '@/components/admin/HomeSectionManager'
import { mapProduct } from '@/lib/products/map'
const categories = [{slug:'care',name_ar:'العناية بالبشرة',parent_slug:null},{slug:'face',name_ar:'العناية بالوجه',parent_slug:'care'},{slug:'cream',name_ar:'كريمات مرطبة',parent_slug:'face'}].map((c,i)=>({...c,id:String(i),url_slug:c.slug,is_active:true,is_featured:false,image_path:null,sort_order:i,updated_at:'2026-01-01T00:00:00Z'}))
const products = ['كريم مرطب','عطر الورد','منتج غير منشور'].map((name,i)=>mapProduct({id:String(i),slug:'fixture-'+i,name_ar:name,name_en:'Fixture',price:5,category:'care',category_label:'العناية',is_active:i!==2,is_out_of_stock:i===1,stock_quantity:10,benefits:[],product_categories:[],product_variants:[],image_url:'/products/body-mist.webp'}))
export default function Page(){const [tab,setTab]=useState('products');return <main dir="rtl" style={{maxWidth:1100,margin:'20px auto',padding:16}}><nav>{['products','categories','hero','bestsellers'].map(t=><button key={t} data-tab={t} onClick={()=>setTab(t)} style={{padding:12}}>{t}</button>)}</nav>{tab==='products'?<ProductManager products={products} total={3} page={1} initialQuery="" categories={categories} currency="JOD"/>:tab==='categories'?<CategoryManager categories={categories} counts={{care:1,face:0,cream:2}}/>:<HomeSectionManager key={tab} section={{section:tab as 'hero'|'bestsellers',updated_at:'2026-01-01T00:00:00Z',products}}/>}</main>}
`)
  const probe = createServer()
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  const origin = `http://127.0.0.1:${port}`
  server = spawn(process.execPath, [join(project, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: directory, env: browserTestEnvironment('http://127.0.0.1:9'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout.on('data', data => process.stdout.write(data))
  server.stderr.on('data', data => process.stderr.write(data))
  await poll(async () => (await fetch(origin + '/admin-ux-qa')).ok, 60000)
  browser = await launchBrowser()
  const results = []
  for (const width of [390, 1440]) {
    const page = await browser.page(width)
    await page.navigate(origin + '/admin-ux-qa')
    await poll(() => page.evaluate(`!!document.querySelector('[name=availability]')`))
    const clickText = async text => { await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error('Missing enabled button');b.click()})()`); await pause(150) }
    const overflow = async () => assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `overflow ${width}`)
    await overflow()
    await page.screenshot(join(artifacts, `products-${width}.png`))
    await clickText('إضافة منتج')
    await poll(() => page.evaluate(`!!document.querySelector('input[type=file]')`))
    await overflow()
    assert.equal(await page.evaluate(`document.querySelectorAll('legend.px-2').length`), 6)
    await page.screenshot(join(artifacts, `editor-${width}.png`))
    await page.click('[data-tab=categories]'); await pause(150)
    await page.click('summary'); await pause(150)
    assert.equal(await page.evaluate(`!!document.querySelector('details[open]')`), true)
    await overflow()
    await clickText('إعادة التصنيف والحذف')
    assert.equal(await page.evaluate(`document.querySelector('form button').disabled`), true, 'deletion requires explicit reassignment choice')
    await page.screenshot(join(artifacts, `categories-${width}.png`))
    for (const section of ['hero', 'bestsellers']) {
      await page.click(`[data-tab=${section}]`); await pause(150)
      await page.evaluate(`document.querySelector('button[aria-label="تحريك عطر الورد للأعلى"]').focus()`)
      await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' })
      await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
      await poll(() => page.evaluate(`document.querySelector('ol li').textContent.includes('1. عطر الورد')`))
      if (width === 390) {
        await page.call('Emulation.setTouchEmulationEnabled', { enabled: true })
        await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
        const point = await page.evaluate(`(()=>{const b=document.querySelector('button[aria-label="تحريك عطر الورد للأسفل"]');b.scrollIntoView({block:'center',behavior:'instant'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
        await pause(300)
        await page.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
        await page.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await poll(() => page.evaluate(`document.querySelector('ol li').textContent.includes('1. كريم مرطب')`))
      }
      await clickText('معاينة الاختيارات')
      assert.equal(await page.evaluate(`document.querySelectorAll('#selection-preview li').length`), 2, 'preview excludes unpublished products')
      assert.ok(await page.evaluate(`document.querySelector('#selection-preview').textContent.includes('نفد')`), 'sold-out products remain in preview')
      await overflow()
      await page.screenshot(join(artifacts, `${section}-${width}.png`))
    }
    results.push({ width, overflow: false, groupedEditor: true, expandableCategories: true, explicitDeletion: true, keyboardReorder: true, touchReorder: width === 390 ? true : 'not tested', preview: true })
    await page.close()
  }
  await writeFile(join(artifacts, 'results.json'), JSON.stringify({ fixtureOnly: true, results }, null, 2))
  console.log(JSON.stringify(results))
} finally {
  if (browser) await browser.close()
  if (server && server.exitCode === null) {
    const kill = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
    await once(kill, 'exit')
  }
  await removeBrowserWorkspace(directory)
}
