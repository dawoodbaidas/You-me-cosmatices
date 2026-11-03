import styles from './StoreBrand.module.css'
import Image from 'next/image'

export default function StoreBrand({ size = 'default' }: { size?: 'default' | 'large' | 'compact' }) {
  return <span className={`${styles.brand} ${styles[size]}`} dir="ltr">
    <Image src="/brand/logo.jpg" alt="You&Me Cosmetics" width={96} height={96}
      sizes={size === 'large' ? '96px' : size === 'compact' ? '44px' : '(max-width:767px) 48px, 56px'} quality={75} />
  </span>
}
