'use client'

import Image from 'next/image'
import { useEffect, useState, type CSSProperties } from 'react'

export default function IntroCurtain() {
  const [visible, setVisible] = useState(true)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const html = document.documentElement
    const body = document.body
    const overflow = body.style.overflow
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const finish = () => {
      html.dataset.intro = 'done'
      body.style.overflow = overflow
      setVisible(false)
    }
    const onMotion = () => { if (motion.matches) finish() }
    motion.addEventListener('change', onMotion)

    async function start() {
      if (motion.matches || html.dataset.intro === 'skip') { finish(); return }
      try {
        if (sessionStorage.getItem('intro-played')) { finish(); return }
      } catch { /* Storage may be unavailable in private browsing. */ }
      body.style.overflow = 'hidden'
      await document.fonts.ready
      if (cancelled || motion.matches || html.dataset.intro === 'done') return
      try { sessionStorage.setItem('intro-played', '1') } catch { /* Play without persistence. */ }
      html.dataset.intro = 'playing'
      setPlaying(true)
      timer = setTimeout(finish, 4500)
    }
    void start()
    return () => {
      cancelled = true
      clearTimeout(timer)
      motion.removeEventListener('change', onMotion)
      body.style.overflow = overflow
      if (html.dataset.intro === 'playing') html.dataset.intro = 'done'
    }
  }, [])

  if (!visible) return null
  return (
    <div id="intro" aria-hidden="true" className={playing ? 'playing' : undefined}>
      <div className="pn l" />
      <div className="pn r" />
      <div className="splash">
        <div className="intro-lockup" dir="ltr">
          <Image className="intro-butterfly" src="/logo-butterfly.png" alt="" width={650} height={551} priority sizes="(max-width: 767px) 92px, 133px" />
          <div className="intro-words">
            <div className="intro-name">
              {Array.from('YOU & ME', (letter, index) => (
                <span key={index} style={{ '--spread': `${(index - 3.5) * 10}px` } as CSSProperties}>{letter === ' ' ? '\u00a0' : letter}</span>
              ))}
            </div>
            <div className="intro-subtitle"><i /><span>COSMETICS</span><i /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
