import { gsap } from 'gsap'

export const HOME_ENTRANCE_SESSION = 'you-me:home-entrance:v1'
export const HOME_ENTRANCE_DEADLINE = 500
let documentOwner: WeakRef<HTMLElement> | undefined

/** Own only the decorative overlay; never pause, hide or resize the storefront. */
export function startHomeEntrance(root: HTMLElement) {
  const started = performance.now()
  let frame = 0
  let deadline: ReturnType<typeof setTimeout> | undefined
  let watchdog: ReturnType<typeof setTimeout> | undefined
  let timeline: gsap.core.Timeline | undefined
  let disposed = false
  let decoding = false
  const listeners = new AbortController()
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const data = matchMedia('(prefers-reduced-data: reduce)')
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection

  const finish = () => {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    clearTimeout(deadline)
    clearTimeout(watchdog)
    timeline?.kill()
    listeners.abort()
    root.hidden = true
    root.dataset.state = 'finished'
  }

  // A skipped or interrupted first mount must not become a later navigation
  // entrance. Weak ownership also allows Strict Mode replay of the same node.
  if (documentOwner && documentOwner.deref() !== root) { finish(); return finish }
  documentOwner = new WeakRef(root)

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  // NavigationTiming keeps the original document URL across client navigation.
  // A tab opened on another route must never show an entrance when going home.
  if (!navigation || new URL(navigation.name).pathname !== '/' || navigation.type === 'back_forward' ||
      location.pathname !== '/' || location.hash || window.scrollY > 0 || document.hidden ||
      motion.matches || data.matches || connection?.saveData) {
    finish()
    return finish
  }

  for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll', 'focusin', 'store:navigate', 'popstate', 'pagehide']) {
    window.addEventListener(event, finish, { capture: true, passive: true, signal: listeners.signal })
  }
  document.addEventListener('visibilitychange', finish, { signal: listeners.signal })
  motion.addEventListener('change', finish, { signal: listeners.signal })
  data.addEventListener('change', finish, { signal: listeners.signal })

  const play = () => {
    if (disposed) return
    if (performance.now() - started >= HOME_ENTRANCE_DEADLINE) { finish(); return }
    clearTimeout(deadline)
    try {
      const panels = root.querySelectorAll('[data-entrance-panel]')
      const logo = root.querySelector('[data-entrance-logo]')
      // The session was claimed before readiness/animation. No async work may
      // resurrect this entrance after an interaction, route change or timeout.
      timeline = gsap.timeline({ paused: true, onComplete: finish, onInterrupt: finish })
      timeline.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0)
        .fromTo(logo, { opacity: 0, scale: 0.94, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 0)
        .to(logo, { opacity: 0, scale: 1.035, y: -6, duration: 0.32, ease: 'power2.inOut' }, 0.48)
        .to(panels[0], { xPercent: -101, duration: 0.9, ease: 'power3.inOut' }, 0.5)
        .to(panels[1], { xPercent: 101, duration: 0.9, ease: 'power3.inOut' }, 0.5)
      root.hidden = false
      root.dataset.state = 'playing'
      watchdog = setTimeout(finish, 1800)
      timeline.play(0)
    } catch { finish() }
  }

  const ready = () => {
    if (disposed || decoding) return
    const hero = document.querySelector<HTMLImageElement>('#home [data-hero-product] img')
    const logo = root.querySelector<HTMLImageElement>('img')
    if (!hero || !logo) { finish(); return }
    if (hero.complete && logo.complete) {
      if (!hero.naturalWidth || !logo.naturalWidth) { finish(); return }
      decoding = true
      Promise.all([hero.decode(), logo.decode()]).then(play, finish)
    } else frame = requestAnimationFrame(ready)
  }

  // Defer claiming to a frame so React's development effect replay can clean
  // up its first setup without consuming the session or leaving a timeline.
  frame = requestAnimationFrame(() => {
    if (disposed) return
    try {
      if (sessionStorage.getItem(HOME_ENTRANCE_SESSION)) { finish(); return }
      sessionStorage.setItem(HOME_ENTRANCE_SESSION, 'seen')
    } catch { finish(); return }
    deadline = setTimeout(finish, Math.max(0, HOME_ENTRANCE_DEADLINE - (performance.now() - started)))
    ready()
  })
  return finish
}
