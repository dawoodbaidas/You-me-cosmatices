export interface CategoryDraft {
  slug: string
  name_ar: string
  parent_slug: string | null
  sort_order: number
  is_active: boolean
  updated_at: string | null
}

export function validateCategory(value: unknown): asserts value is CategoryDraft {
  const category = value as CategoryDraft | null
  const slug = (value: unknown) => typeof value === 'string' && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value !== 'all'
  if (!category || !slug(category.slug) || (category.parent_slug !== null && (!slug(category.parent_slug) || category.parent_slug === category.slug))) throw new Error('رابط القسم أو القسم الرئيسي غير صالح.')
  if (typeof category.name_ar !== 'string' || !category.name_ar.trim() || category.name_ar.length > 150) throw new Error('أدخل اسم القسم (150 حرفاً كحد أقصى).')
  if (!Number.isInteger(category.sort_order) || Math.abs(category.sort_order) > 2147483647 || typeof category.is_active !== 'boolean') throw new Error('ترتيب القسم أو حالته غير صالح.')
  if (category.updated_at !== null && (typeof category.updated_at !== 'string' || !Number.isFinite(Date.parse(category.updated_at)))) throw new Error('إصدار التعديل غير صالح. حدّث الصفحة.')
}
