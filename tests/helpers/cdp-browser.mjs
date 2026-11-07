import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'

export const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
export async function poll(check, timeout = 30000) {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { const result = await check(); if (result) return result } catch (error) { last = error } await pause(50) }
  throw last ?? Error('Timed out')
}
export async function launchBrowser() {
  const probe = createServer()
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  const profile = await mkdtemp(join(tmpdir(), 'you-me-navigation-chrome-'))
  const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
  const version = await poll(() => fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json()))
  const ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), listeners = new Set()
  ws.onmessage = event => {
    const data = JSON.parse(event.data)
    if (data.id) {
      const item = pending.get(data.id); if (!item) return
      pending.delete(data.id); clearTimeout(item.timer)
      if (data.error) item.reject(Error(JSON.stringify(data.error))); else item.resolve(data.result)
    } else listeners.forEach(listener => listener(data))
  }
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const key = ++id
    const timer = setTimeout(() => { pending.delete(key); reject(Error('CDP timeout: ' + method)) }, 60000)
    pending.set(key, { resolve, reject, timer }); ws.send(JSON.stringify({ id: key, method, params, sessionId }))
  })
  return {
    send,
    listen(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    async page(width = 390) {
      const { browserContextId } = await send('Target.createBrowserContext')
      const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId })
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
      const call = (method, params) => send(method, params, sessionId)
      await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable'); await call('Page.bringToFront')
      await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 2, mobile: width < 768 })
      const evaluate = async expression => {
        const data = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
        if (data.exceptionDetails) throw Error(data.exceptionDetails.exception?.description ?? data.exceptionDetails.text)
        return data.result.value
      }
      return { call, evaluate, sessionId,
        async navigate(url) { await call('Page.navigate', { url }); await poll(() => evaluate(`document.readyState==='complete' && location.href===${JSON.stringify(url)}`)); await pause(500) },
        click(selector) { return evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`) },
        async screenshot(path) { const { data } = await call('Page.captureScreenshot', { format: 'png' }); await writeFile(path, Buffer.from(data, 'base64')) },
        close: () => send('Target.disposeBrowserContext', { browserContextId }),
      }
    },
    async close() { try { await send('Browser.close') } finally { ws.close(); if (child.exitCode === null) child.kill() } },
  }
}
