import type { CategoryFilter, Product } from '@/types/product'

export interface CategoryOption {
  key: CategoryFilter
  label: string
}

/**
 * Filter bar copied from the original UI, in the same order.
 * `skincare-body` and `bestseller` are derived filters, not product categories.
 */
export const CATEGORY_FILTERS: CategoryOption[] = [
  { key: 'all', label: 'الكل' },
  { key: 'packages', label: 'باكيجات مميزة' },
  { key: 'mist', label: 'عطور ومسك' },
  { key: 'skincare', label: 'العناية بالبشرة' },
  { key: 'skincare-body', label: 'العناية بالجسم' },
  { key: 'makeup', label: 'مكياج' },
  { key: 'lips', label: 'شفاه وعيون' },
  { key: 'bestseller', label: 'الأكثر مبيعاً' },
]

/** Body-care filter: label contains "الجسم", plus the deodorant exception. */
const BODY_EXTRAS = new Set(['nivea-deo-72h'])

export function filterProducts(products: Product[], filter: CategoryFilter): Product[] {
  switch (filter) {
    case 'all':
      return products
    case 'bestseller':
      return products.filter((product) => Boolean(product.badge))
    case 'skincare-body':
      return products.filter(
        (product) => product.categoryLabel.includes('الجسم') || BODY_EXTRAS.has(product.slug),
      )
    case 'mist':
      return products.filter(
        (product) =>
          product.category === 'mist' ||
          product.categoryLabel.includes('عطور') ||
          product.categoryLabel.includes('مسك'),
      )
    default:
      return products.filter((product) => product.category === filter)
  }
}
