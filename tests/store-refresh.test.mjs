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
  window.setInterval = callback => { poll = callback; return 1 }
  window.clearInterval = id => { assert.equal(id, 1); poll = null }
  document.hidden = false
  let cleanup, resolveRead, reads = 0, refreshes = 0, realtime
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
  new Function('require', 'exports', 'process', 'window', 'document', source)(name => stubs[name], exports, {
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public' },
  }, window, document)
  exports.useStoreRefresh('7')
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
  cleanup()
  window.dispatchEvent(new Event('focus'))
  assert.equal(reads, 3)
})
