import test from 'node:test'
import assert from 'node:assert/strict'
import { loadedProductImage, rememberProductImage, productImageFrame, rememberProductImageFrame } from '../src/lib/product-media.ts'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { modules } from './helpers/load-app.mjs'

test('catalogue and detail images preserve complete artwork before decoded framing', () => {
  const load = modules({ 'next/image': { __esModule: true, default: ({ style }) => createElement('img', { style, alt: '' }) } })
  const Media = load('@/components/ProductMedia').default
  for (const [options, fit] of [[{ listing: true }, 'contain'], [{}, 'contain'], [{ listing: true, mode: 'contain' }, 'contain']]) {
    const html = renderToStaticMarkup(createElement(Media, { src: '/test.webp', alt: 'Product', sizes: '100px', ...options }))
    assert.ok(html.includes(`object-fit:${fit}`))
  }
})

test('media records preserve exact source identity, larger decoded renditions and framing', () => {
  const source = 'https://images.test/original.webp?v=1'
  const large = { currentSrc: '/_next/image?w=1080&q=75', width: 1080, height: 720 }
  rememberProductImage(source, large)
  rememberProductImage(source, { currentSrc: '/thumbnail', width: 96, height: 64 })
  assert.deepEqual(loadedProductImage(source), large)
  assert.equal(loadedProductImage('https://images.test/original.webp?v=2'), undefined)
  assert.equal(loadedProductImage('/scene-cutout.webp'), undefined)
  const frame = { width: 256, height: 128, subject: { x: 10, y: 5, width: 230, height: 118 } }
  rememberProductImageFrame(source, frame)
  assert.deepEqual(productImageFrame(source), frame)
  rememberProductImage(source, { currentSrc: '/failed', width: 0, height: 0 })
  assert.deepEqual(loadedProductImage(source), large)
})

test('display metadata has a 100-source LRU bound, including framing records', () => {
  const image = { currentSrc: '/decoded', width: 100, height: 100 }
  for (let i = 0; i < 100; i++) rememberProductImage(`lru-${i}`, image)
  loadedProductImage('lru-0')
  rememberProductImageFrame('new-frame', { width: 100, height: 100, subject: { x: 0, y: 0, width: 100, height: 100 } })
  assert.equal(loadedProductImage('lru-1'), undefined)
  assert.deepEqual(loadedProductImage('lru-0'), image)
})
