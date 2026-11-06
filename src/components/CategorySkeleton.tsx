import styles from './ProductCard.module.css'
import { ProductGridSkeleton } from './StoreSkeleton'
import './category-skeleton.css'

// Category loading state rendered below the shared store layout: the real
// header stays mounted, this only fills the page slot on client navigation.
export default function CategorySkeleton() {
  return <div className="category-skeleton" role="status" aria-busy="true" aria-label="جارٍ تحميل القسم">
    <span className="sr-only">جارٍ تحميل القسم</span>
    <nav className="category-circles store-departments" aria-hidden="true">
      <div className="category-circle-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <span className="category-skeleton-orb-wrap" key={index}>
            <span className={'category-skeleton-orb tone-' + (index % 4)} />
            <span className={`category-skeleton-label ${styles.skeleton}`} />
          </span>
        ))}
      </div>
    </nav>
    <ProductGridSkeleton />
  </div>
}
