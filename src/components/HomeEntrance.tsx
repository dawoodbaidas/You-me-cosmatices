'use client'

import Image from 'next/image'
import { useLayoutEffect, useRef } from 'react'
import { startHomeEntrance } from '@/lib/home-entrance'
import styles from './HomeEntrance.module.css'

export default function HomeEntrance() {
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (root.current) return startHomeEntrance(root.current)
  }, [])

  return <div ref={root} hidden aria-hidden="true" className={styles.entrance} data-home-entrance>
    <div className={styles.left} data-entrance-panel />
    <div className={styles.right} data-entrance-panel />
    <div className={styles.logo} data-entrance-logo>
      <Image src="/brand/logo.jpg" alt="" width={144} height={144} sizes="144px" quality={75} loading="eager" />
    </div>
  </div>
}
