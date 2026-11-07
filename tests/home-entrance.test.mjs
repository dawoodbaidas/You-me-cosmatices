import test from 'node:test'
import assert from 'node:assert/strict'
import { modules } from './helpers/load-app.mjs'

async function fixture(options, check) {
  const keys = ['window', 'document', 'navigator', 'location', 'sessionStorage', 'performance', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout']
  const saved = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const frames = new Map(), timers = new Map(), store = new Map(), events = new EventTarget()
  let sequence = 0, now = 0, killed = 0, played = 0, config
  const tweens = []
  const image = { complete: !options.slow, naturalWidth: options.broken ? 0 : 100, decode: async () => {} }
  const root = { hidden: true, dataset: {}, querySelector: () => image, querySelectorAll: () => ['left', 'right'] }
  const timeline = { fromTo(...args) { tweens.push(args); return this }, to(...args) { tweens.push(args); return this }, kill() { killed++ }, play() { played++ } }
  if (options.seen) store.set('you-me:home-entrance:v1', 'seen')
  const globals = {
    window: Object.assign(events, { scrollY: 0 }), document: Object.assign(new EventTarget(), { hidden: false, querySelector: () => image }),
    navigator: { connection: { saveData: options.saveData } }, location: { pathname: '/', hash: '' },
    sessionStorage: { getItem: key => { if (options.storageFailure) throw Error('denied'); return store.get(key) }, setItem: (key, value) => store.set(key, value) },
    performance: { now: () => now, getEntriesByType: () => [{ name: 'https://store.test' + (options.initialPath ?? '/'), type: options.history ? 'back_forward' : 'navigate' }] },
    matchMedia: query => Object.assign(new EventTarget(), { matches: options.reduced && query.includes('motion') }),
    requestAnimationFrame: fn => { frames.set(++sequence, fn); return sequence }, cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, delay) => { timers.set(++sequence, { fn, delay }); return sequence }, clearTimeout: id => timers.delete(id),
  }
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value })
    const { startHomeEntrance } = modules({ gsap: { gsap: { timeline: value => { config = value; return timeline } } } })('@/lib/home-entrance')
    const cleanup = startHomeEntrance(root)
    const frame = async () => { const entries = [...frames]; frames.clear(); entries.forEach(([, fn]) => fn()); await Promise.resolve(); await Promise.resolve() }
    await check({ root, frames, timers, store, events, tweens, cleanup, frame, remount: () => startHomeEntrance({ ...root, dataset: {} }), finish: () => config.onComplete(), advance: value => { now = value }, played: () => played, killed: () => killed })
  } finally {
    for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] }
  }
}

test('entrance claims session before playing one 1.4s timeline and releases its resources', async () => fixture({}, async f => {
  await f.frame()
  assert.equal(f.store.size, 1)
  assert.equal(f.played(), 1)
  assert.equal(f.root.hidden, false)
  assert.equal(f.tweens.at(-1)[1].duration + f.tweens.at(-1)[2], 1.4)
  f.finish()
  assert.equal(f.root.hidden, true)
  assert.equal(f.frames.size + f.timers.size, 0)
  assert.equal(f.killed(), 1)
  f.events.dispatchEvent(new Event('pointerdown'))
  assert.equal(f.killed(), 1)
}))

test('entrance skips repeat sessions, reduced motion/data, storage denial, history and internal arrivals', async () => {
  for (const options of [{ seen: true }, { reduced: true }, { saveData: true }, { storageFailure: true }, { history: true }, { initialPath: '/categories' }, { broken: true }]) {
    await fixture(options, async f => { await f.frame(); assert.equal(f.played(), 0); assert.equal(f.root.hidden, true); assert.equal(f.frames.size + f.timers.size, 0) })
  }
})

test('slow readiness times out without covering content or replaying later', async () => fixture({ slow: true }, async f => {
  await f.frame()
  assert.equal(f.root.hidden, true)
  assert.equal(f.store.size, 1)
  f.advance(500)
  const timeout = [...f.timers.values()].find(timer => timer.delay === 500)
  timeout.fn()
  await f.frame()
  assert.equal(f.played(), 0)
  assert.equal(f.frames.size + f.timers.size, 0)
}))

test('a skipped first visit cannot turn into an entrance during later navigation', async () => {
  const options = { reduced: true }
  await fixture(options, async f => {
    options.reduced = false
    f.remount()
    await f.frame()
    assert.equal(f.played(), 0)
    assert.equal(f.frames.size + f.timers.size, 0)
  })
})

test('interaction, route departure and unmount dismiss immediately, including pending decode', async () => {
  for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll', 'focusin', 'store:navigate', 'popstate', 'pagehide']) {
    await fixture({}, async f => { await f.frame(); f.events.dispatchEvent(new Event(event)); assert.equal(f.root.hidden, true); assert.equal(f.frames.size + f.timers.size, 0) })
  }
  await fixture({}, async f => { f.cleanup(); await f.frame(); assert.equal(f.played(), 0); assert.equal(f.store.size, 0) })
})
