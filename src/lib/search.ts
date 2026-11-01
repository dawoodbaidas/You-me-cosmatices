import type { Product } from '@/types/product'

export function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ar')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ').trim()
}

export function matchesProduct(product: Product, query: string) {
  const text = normalizeSearch([product.nameAr, product.nameEn, product.categoryLabel,
    product.description ?? '', ...product.variants.map(variant => variant.label)].join(' '))
  return product.isActive !== false && normalizeSearch(query).split(' ').every(term => text.includes(term))
}
