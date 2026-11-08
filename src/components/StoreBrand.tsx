import styles from './StoreBrand.module.css'

export default function StoreBrand({ size = 'default' }: { size?: 'default' | 'large' | 'compact' }) {
  return <span className={`${styles.brand} ${styles[size]}`} dir="ltr" aria-label="YOU AND ME">
    <span className={styles.name}>You<i>and</i>Me</span>
  </span>
}
