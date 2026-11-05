export interface CategoryDraft {
  image_path?: string | null
  is_featured?: boolean
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
  if (category.image_path != null && !/^categories\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(category.image_path)) throw new Error('صورة القسم غير صالحة.')
  if (category.is_featured !== undefined && typeof category.is_featured !== 'boolean') throw new Error('حالة القسم غير صالحة.')
  if (category.updated_at !== null && (typeof category.updated_at !== 'string' || !Number.isFinite(Date.parse(category.updated_at)))) throw new Error('إصدار التعديل غير صالح. حدّث الصفحة.')
}
