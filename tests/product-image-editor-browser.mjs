// Isolated real-browser QA; no production auth, database, or Storage credentials.
// Run: node tests/product-image-editor-browser.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'
import { browserTestEnvironment, createBrowserWorkspace, removeBrowserWorkspace } from './helpers/browser-workspace.mjs'

const project = resolve(import.meta.dirname, '..'), artifact = join(project, 'artifacts/product-image-editor')
const directory = await createBrowserWorkspace(project)
let next, chrome
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function port() { const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const value = probe.address().port; await new Promise(resolve => probe.close(resolve)); return value }
async function poll(check, timeout = 30_000) { const start = Date.now(); let last; while (Date.now() - start < timeout) { try { const value = await check(); if (value) return value } catch (error) { last = error } await pause(250) } throw last ?? new Error('Timed out') }
async function stop(child) { if (!child || child.exitCode !== null) return; const kill = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); await once(kill, 'exit'); if (child.exitCode === null) await once(child, 'exit') }

// Native Node WebSocket is sufficient for the small CDP surface these tests exercise.
async function cdp(url) {
  const ws = new WebSocket(url), pending = new Map(), listeners = new Map(); let id = 0
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  ws.onmessage = event => { const data = JSON.parse(event.data); if (data.id) { const call = pending.get(data.id); pending.delete(data.id); if (data.error) call.reject(new Error(JSON.stringify(data.error))); else call.resolve(data.result) } else for (const listener of listeners.get(data.method) ?? []) listener(data.params, data.sessionId) }
  return { send(method, params = {}, sessionId) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params, sessionId })) }) }, on(method, listener) { const list = listeners.get(method) ?? []; list.push(listener); listeners.set(method, list) }, close() { ws.close() } }
}

try {
  await mkdir(artifact, { recursive: true })
  const pageDir = join(directory, 'src/app/image-qa'); await mkdir(pageDir, { recursive: true })
  await writeFile(join(pageDir, 'page.tsx'), `'use client'
import ProductManager from '@/components/admin/ProductManager'
export default function Page() { return <main style={{maxWidth:1100,margin:'40px auto',padding:16}}><ProductManager products={[]} total={0} page={1} initialQuery="" categories={[]} currency="JOD" onEditingChange={()=>{}} /></main> }
`)
  const httpPort = await port(), debugPort = await port(), origin = `http://127.0.0.1:${httpPort}`
  next = spawn(process.execPath, [join(project, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(httpPort)], { cwd: directory, env: browserTestEnvironment('http://127.0.0.1:9'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  next.stdout.on('data', data => process.stdout.write(data)); next.stderr.on('data', data => process.stderr.write(data))
  await poll(async () => (await fetch(origin + '/image-qa')).ok, 60_000)
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${join(directory, 'qa-chrome-profile')}`, `--remote-debugging-port=${debugPort}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
  const targets = await poll(async () => (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json())
  const client = await cdp(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  const evaluate = async expression => { const value = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails)); return value.result.value }
  const click = async text => { assert.equal(await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!button||button.disabled)return false;button.click();return true})()`), true, `click ${text}`); await pause(100) }
  const requests = [], errors = []
  // Synthetic alpha fixture, not a claim about provider segmentation quality.
  const pixels = Buffer.alloc(320 * 240 * 4)
  for (let y = 25; y < 215; y++) for (let x = 100; x < 220; x++) pixels.set([64, 111, 160, 255], (y * 320 + x) * 4)
  const processed = await sharp(pixels, { raw: { width: 320, height: 240, channels: 4 } }).webp({ lossless: true }).toBuffer()
  client.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.text))
  await client.send('Runtime.enable'); await client.send('Page.enable')
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/admin/products*', requestStage: 'Request' }] })
  client.on('Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      requests.push({ url: request.url, body: request.postData })
      const removal = request.url.endsWith('remove-background'), first = requests.length === 1
      const body = removal && !first ? processed : Buffer.from(JSON.stringify(removal ? { ok: false, message: 'نفدت حصة remove.bg المتاحة.' } : { ok: true, message: 'تم الحفظ في اختبار معزول' }))
      await client.send('Fetch.fulfillRequest', { requestId, responseCode: removal && first ? 429 : 200, responseHeaders: [{ name: 'Content-Type', value: removal && !first ? 'image/webp' : 'application/json' }], body: body.toString('base64') })
    } catch (error) { errors.push(error.message) }
  })
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await client.send('Page.navigate', { url: origin + '/image-qa' })
  await poll(() => evaluate(`document.body.textContent.includes('إضافة منتج')`))
  await poll(async () => { if (await evaluate(`!!document.querySelector('input[type=file]')`)) return true; await click('إضافة منتج'); return false })
  const dom = await client.send('DOM.getDocument'), fileNode = await client.send('DOM.querySelector', { nodeId: dom.root.nodeId, selector: 'input[type=file]' })
  await client.send('DOM.setFileInputFiles', { nodeId: fileNode.nodeId, files: [join(project, 'public/products/hyaluronic-cream.png')] })
  await poll(() => evaluate(`!!document.querySelector('img[alt="الصورة الأصلية"]')?.naturalWidth`))
  assert.equal(requests.length, 0, 'selecting a file never calls provider or Storage')
  assert.equal(await evaluate(`document.querySelector('button[type=submit]').disabled`), true)
  assert.equal(await evaluate(`document.body.textContent.includes('فرشاة') || document.body.textContent.includes('تطبيق القص')`), false)
  await click('إزالة الخلفية')
  await poll(() => evaluate(`document.querySelector('[role=alert]')?.textContent.includes('نفدت حصة')`))
  assert.equal(requests.length, 1, 'one click makes one request and errors do not retry')
  await click('استخدام الصورة الأصلية')
  assert.equal(await evaluate(`document.querySelector('button[type=submit]').disabled`), false)
  await click('إزالة الخلفية')
  await poll(() => evaluate(`!!document.querySelector('img[alt="الصورة بعد إزالة الخلفية"]')?.naturalWidth`))
  assert.equal(requests.length, 2)
  assert.equal(await evaluate(`document.querySelector('button[type=submit]').disabled`), true, 'results are not auto-approved')
  const screenshot = async name => { const data = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(join(artifact, name), Buffer.from(data.data, 'base64')) }
  await screenshot('desktop-remove-bg.png')
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), true, 'no mobile overflow')
  await screenshot('mobile-remove-bg.png')
  await click('اعتماد النتيجة')
  assert.equal(requests.length, 2, 'confirmation does not upload to Storage')
  for (const [name, value] of [['name_ar', 'اختبار المنتج'], ['name_en', 'Test product'], ['slug', 'test-remove-bg']]) await evaluate(`(()=>{const input=document.querySelector('[name=${name}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await click('حفظ المنتج')
  await poll(() => requests.length === 3)
  assert.ok(requests[2].url.endsWith('/api/admin/products'))
  assert.ok(requests[2].body.includes('image_confirmed')); assert.ok(requests[2].body.includes('image_processed'))
  assert.equal((requests[2].body.match(/name="image"/g) ?? []).length, 1, 'save submits only the approved image')
  assert.equal(requests.some(item => item.body?.includes('REMOVE_BG_API_KEY')), false)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, providerRequests: 2, saveRequests: 1, mockedNetwork: true, screenshots: artifact }))
  client.close()
} finally {
  await stop(chrome); await stop(next)
  await removeBrowserWorkspace(directory)
}
