// Read-only local profiling: no credentials, headers or response bodies are logged.
import { appendFileSync, mkdirSync } from 'node:fs'
const label = process.env.STORE_PROFILE
if (label && /^[a-z-]+$/.test(label)) {
  mkdirSync('artifacts/store-speed', { recursive: true })
  const original = globalThis.fetch
  globalThis.fetch = async (...args) => {
    const url = new URL(typeof args[0] === 'string' || args[0] instanceof URL ? args[0] : args[0].url)
    if (!url.pathname.startsWith('/rest/v1/')) return original(...args)
    const start = performance.now()
    try {
      const response = await original(...args)
      appendFileSync(`artifacts/store-speed/${label}-database.jsonl`, JSON.stringify({ at: Date.now(), path: url.pathname, filters: url.search, ms: performance.now() - start, status: response.status }) + '\n')
      return response
    } catch (error) {
      appendFileSync(`artifacts/store-speed/${label}-database.jsonl`, JSON.stringify({ at: Date.now(), path: url.pathname, ms: performance.now() - start, error: error.name }) + '\n')
      throw error
    }
  }
}
