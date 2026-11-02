import { CardIcon, ShieldIcon, TruckIcon } from '@/components/icons'
import styles from './Hero.module.css'

const ITEMS = [
  { icon: ShieldIcon, title: 'منتجات أصلية', sub: 'مضمونة الجودة' },
  { icon: TruckIcon, title: <>توصيل سريع<br />في الأردن</>, sub: <>خلال <bdi>24</bdi> ساعة</> },
  { icon: CardIcon, title: 'دفع عند الاستلام', sub: 'آمن وسهل' },
]

export default function FeatureStrip() {
  return (
    <section dir="rtl" aria-label="مزايا التسوق معنا" className={styles.benefits}>
      <ul className={styles.benefitList}>
        {ITEMS.map(({ icon: Icon, title, sub }) => (
          <li key={typeof title === 'string' ? title : 'delivery'} className={styles.benefitItem}>
            <Icon className={styles.benefitIcon} />
            <div>
              <p className={styles.benefitTitle}>{title}</p>
              <p className={styles.benefitSub}>{sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
