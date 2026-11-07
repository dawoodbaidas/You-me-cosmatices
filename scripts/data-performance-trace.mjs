// Diagnostic preload only. Records upstream paths/timing, never headers or keys.
import { subscribe } from 'node:diagnostics_channel'
import { appendFileSync } from 'node:fs'
const starts = new WeakMap()
subscribe('undici:request:create', ({ request }) => {
  if (!request.path.startsWith('/rest/v1/')) return
  starts.set(request, performance.now())
})
subscribe('undici:request:trailers', ({ request }) => {
  if (!starts.has(request) || !process.env.DATA_TRACE_FILE) return
  appendFileSync(process.env.DATA_TRACE_FILE, JSON.stringify({ time: Date.now(), path: request.path.split('?')[0], duration: performance.now() - starts.get(request) }) + '\n')
})
