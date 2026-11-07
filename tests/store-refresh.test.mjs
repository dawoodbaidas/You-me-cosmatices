import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

test('cached navigation refreshes only changed revisions and deduplicates concurrent checks', async () => {
  const source = ts.transpileModule(readFileSync(new URL('../src/components/useStoreRefresh.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const window = new EventTarget(), document = new EventTarget()
  let poll
  window.setInterval = (callback, delay) => { assert.equal(delay, 15_000); poll = callback; return 1 }
  window.clearInterval = id => { assert.equal(id, 1); poll = null }
  document.hidden = false
  let cleanup, resolveRead, reads = 0, refreshes = 0, realtime
  let now = 1000
  const channel = { on: (_event, _filter, callback) => { realtime = callback; return channel }, subscribe: () => channel }
  const client = {
    from: () => ({ select: () => ({ eq: () => { reads++; return new Promise(resolve => { resolveRead = resolve }) } }) }),
    channel: () => channel, removeChannel: async () => {},
  }
  const exports = {}
  const stubs = {
    react: { useEffect: effect => { cleanup = effect() } },
    'next/navigation': { useRouter: () => ({ refresh: () => { refreshes++ } }) },
    '@/lib/supabase/client': { createClient: () => client },
  }
  new Function('require', 'exports', 'process', 'window', 'document', 'Date', source)(name => stubs[name], exports, {
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public' },
  }, window, document, { now: () => now })
  const observed=[]
  exports.useStoreRefresh('7', revision => observed.push(revision))
  window.dispatchEvent(new Event('focus'))
  poll()
  assert.equal(reads, 1)
  resolveRead({ data: [{ version: 7 }], error: null })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(refreshes, 0)
  window.dispatchEvent(new Event('popstate'))
  assert.equal(reads, 2)
  resolveRead({ data: null, error: { message: 'offline' } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(refreshes, 0)
  realtime()
  resolveRead({ data: [{ version: 8 }], error: null })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(refreshes, 1)
  // An aborted/failed RSC refresh can leave the hook's revision unchanged.
  window.dispatchEvent(new Event('online'))
  poll()
  assert.equal(reads, 3)
  now += 30_000
  poll()
  assert.equal(reads, 4)
  resolveRead({ data: [{ version: 8 }], error: null })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(refreshes, 2)
  assert.deepEqual(observed,['7','8','8'])
  cleanup()
  window.dispatchEvent(new Event('focus'))
  assert.equal(reads, 4)
})
