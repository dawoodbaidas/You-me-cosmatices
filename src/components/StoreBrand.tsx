import styles from './StoreBrand.module.css'
import Image from 'next/image'
import logo from '../../public/brand/logo-circular.png'

export default function StoreBrand({ size = 'default' }: { size?: 'default' | 'large' | 'compact' }) {
  return <span className={`${styles.brand} ${styles[size]}`} dir="ltr" aria-label="YOU AND ME">
    <span className={styles.name} aria-hidden="true">You<i>and</i>Me</span>
    <span className={styles.logoFrame}><Image className={styles.logo} src={logo} alt="YOU & ME Cosmetics" sizes="128px" /></span>
  </span>
}
