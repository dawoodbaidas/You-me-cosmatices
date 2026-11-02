import type { Collection } from './taxonomy'
import type { Product } from '@/types/product'
import type { StoreCategory } from '@/types/store'

export const collectionHref = (slug: string | null) => `/category/${encodeURIComponent(slug ?? 'all')}`

export function storeCollections(categories: StoreCategory[], products: Product[]): Collection[] {
  const active = categories.filter(category => category.is_active).sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug))
  const build = (category: StoreCategory): Collection => {
    const children = active.filter(child => child.parent_slug === category.slug).map(build)
    return {
      id: category.slug, label: category.name_ar, children,
      productIds: [...new Set([...products.filter(product => product.categorySlugs?.includes(category.slug)).map(product => product.id), ...children.flatMap(child => child.productIds)])],
    }
  }
  return active.filter(category => category.parent_slug === null).map(build)
}

export function findCollection(groups: Collection[], slug: string | null): Collection | undefined {
  for (const group of groups) {
    if (group.id === slug) return group
    const child = findCollection(group.children, slug)
    if (child) return child
  }
}
