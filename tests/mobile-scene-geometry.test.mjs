import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mobileSubjectScale, mobileShowcaseGeometry } from '../src/lib/mobile-scene-geometry.ts'

test('mobile subject budgets balance wide and tall artwork while preserving aspect and containing all pixels', () => {
  const areas = []
  for (const [width, height] of [[100,100], [60,180], [180,90]]) {
    const scale = mobileSubjectScale(width, height, 120, 250, 1)
    assert.ok(width * scale <= 120 + 1e-8)
    assert.ok(height * scale <= 250 + 1e-8)
    assert.ok(width * height * scale ** 2 <= 14400 + 1e-8)
    areas.push(width * height * scale ** 2)
    const highResolution = mobileSubjectScale(width * 4, height * 4, 120, 250, 1)
    assert.ok(Math.abs(scale - highResolution * 4) < 1e-8, 'source resolution must not determine visual weight')
  }
  assert.ok(Math.max(...areas) / Math.min(...areas) <= 2)
})

test('mobile arc remains continuous and reversible across product boundaries at every target viewport', () => {
  for (const width of [360,375,390,430]) {
    const step = Math.abs(mobileShowcaseGeometry(1,width).x)
    assert.ok(Math.abs(step / (width * .33) - 1.25) < 1e-8)
    let last = mobileShowcaseGeometry(-2,width)
    for (let i = -199; i <= 200; i++) {
      const delta = i / 100, next = mobileShowcaseGeometry(delta,width), reverse = mobileShowcaseGeometry(-delta,width)
      assert.ok(Math.abs(next.x + reverse.x) < 1e-8)
      assert.equal(next.y, reverse.y)
      assert.ok(Math.abs((last.x - next.x) - step / 100) < 1e-8, 'no speed jump at product boundaries')
      assert.ok(next.scale >= .55 && next.scale <= 1)
      last = next
    }
  }
})
