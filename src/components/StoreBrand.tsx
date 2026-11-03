import styles from './StoreBrand.module.css'

export default function StoreBrand({ size = 'default' }: { size?: 'default' | 'large' | 'compact' }) {
  return <span className={`${styles.brand} ${styles[size]}`} dir="ltr">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/brand/logo.jpg" alt="You&Me Cosmetics" width={64} height={64} />
  </span>
}
