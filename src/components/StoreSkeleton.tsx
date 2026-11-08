import styles from './ProductCard.module.css'

export function ProductGridSkeleton() {
  return <div className={styles.listing} role="status" aria-label="جارٍ تحميل المنتجات" aria-busy="true">
    <span className="sr-only">جارٍ تحميل المنتجات…</span>
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => <div className={styles.card} key={index}>
        <div className={`${styles.tile} ${styles.skeleton}`} />
        <div className={styles.details}>
          <div className={styles.info}>
            <div className={`${styles.skeleton} ${styles.skeletonCategory}`} />
            <div className={`${styles.skeleton} ${styles.skeletonName}`} />
            <div className={`${styles.skeleton} ${styles.skeletonCategory}`} />
          </div>
          <div className={styles.controls}>
            <div className={`${styles.skeleton} ${styles.skeletonPrice}`} />
            <div className={`${styles.skeleton} ${styles.skeletonButton}`} />
          </div>
        </div>
      </div>)}
    </div>
  </div>
}

export default function StoreSkeleton() {
  return <div className={styles.loadingPage}>
    <div className={styles.loadingHeader} aria-hidden="true" />
    <main className={styles.loadingContent}>
      <div className={`${styles.skeleton} ${styles.skeletonName}`} aria-hidden="true" />
      <ProductGridSkeleton />
    </main>
  </div>
}
