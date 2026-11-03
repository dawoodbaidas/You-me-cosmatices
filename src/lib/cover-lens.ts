/** Coordinates in CSS pixels after centered object-fit: cover cropping. */
export function coverLens(width: number, height: number, naturalWidth: number, naturalHeight: number, x: number, y: number, fit = 'cover') {
  const scale = (fit === 'contain' ? Math.min : Math.max)(width / naturalWidth, height / naturalHeight)
  const w = naturalWidth * scale, h = naturalHeight * scale
  return { w: w * 2.4, h: h * 2.4, x: 56 - (x + (w - width) / 2) * 2.4, y: 56 - (y + (h - height) / 2) * 2.4 }
}
