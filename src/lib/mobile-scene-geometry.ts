/** Mobile artwork shares a visible-area budget, so wide jars and tall bottles
 * have comparable weight without changing their aspect ratios. */
export function mobileSubjectScale(width: number, height: number, frameWidth: number, frameHeight: number, weight: number) {
  const area = (Math.min(frameWidth, frameHeight) ** 2) * weight
  return Math.min(frameWidth / width, frameHeight / height, Math.sqrt(area / (width * height)))
}

/** One continuous half-arc, with 25% more travel than the desktop's .33 step.
 * Narrow frames leave room between two equally prominent products at midpoint. */
export function mobileShowcaseGeometry(delta: number, width: number) {
  const distance = Math.abs(delta)
  const step = width * .33 * 1.25
  return {
    x: -delta * step,
    y: distance ** 2 * width * .09,
    rotation: delta * -5,
    scale: Math.max(.55, 1 - .28 * distance),
  }
}
