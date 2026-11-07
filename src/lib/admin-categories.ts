import type { StoreCategory } from '@/types/store'

/** Full ancestry keeps identically named children distinguishable in selectors. */
export function adminCategoryLabel(category: StoreCategory, categories: StoreCategory[]) {
  const names = [category.name_ar]
  const seen = new Set([category.slug])
  let parent = categories.find(item => item.slug === category.parent_slug)
  while (parent && !seen.has(parent.slug)) {
    names.unshift(parent.name_ar)
    seen.add(parent.slug)
    parent = categories.find(item => item.slug === parent!.parent_slug)
  }
  return names.join(' / ')
}
