import styles from './StockBadge.module.css'

export default function StockBadge({ outOfStock = true, overlay = false }: { outOfStock?: boolean; overlay?: boolean }) {
  return <span className={`${styles.badge} ${outOfStock ? styles.unavailable : styles.available} ${overlay ? styles.overlay : ''}`}>
    {outOfStock ? 'نفد من المخزون' : 'متاح للشراء'}
  </span>
}
