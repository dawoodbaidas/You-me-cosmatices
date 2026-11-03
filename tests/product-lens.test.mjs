import test from 'node:test'
import assert from 'node:assert/strict'
import { coverLens } from '../src/lib/cover-lens.ts'

test('lens aligns the exact touched pixel for portrait and landscape cover crops', () => {
  for (const [nw, nh] of [[1000, 500], [500, 1000], [800, 1000]]) {
    for (const [x, y] of [[0, 0], [160, 200], [319, 399]]) {
      const result = coverLens(320, 400, nw, nh, x, y)
      const scale = Math.max(320 / nw, 400 / nh)
      const sourceX = (x + (nw * scale - 320) / 2) / scale
      const sourceY = (y + (nh * scale - 400) / 2) / scale
      assert.ok(Math.abs(result.x + sourceX * scale * 2.4 - 56) < 1e-8)
      assert.ok(Math.abs(result.y + sourceY * scale * 2.4 - 56) < 1e-8)
      assert.ok(result.w >= 320 * 2.4 && result.h >= 400 * 2.4)
    }
  }
})

test('contain lens retains centered letterboxing without stretching', () => {
 const result = coverLens(140,140,280,140,70,70,'contain')
 assert.equal(result.w,336)
 assert.equal(result.h,168)
 assert.equal(result.x,56-70*2.4)
 assert.equal(result.y,56-35*2.4)
})
