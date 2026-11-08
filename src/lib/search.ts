import type { Product } from '@/types/product'

export function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ar')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ').trim()
}

// Quote PostgREST values separately from regex escaping: punctuation is literal.
export function searchFilters(query: string): Record<string, string> {
  const terms = normalizeSearch(query).slice(0, 120).split(' ').filter(Boolean)
  if (!terms.length) return { limit: '0' }
  const clauses = terms.map(term => {
    const pattern = Array.from(term, char => {
      const letter = char === 'ا' ? '[اأإآٱ]' : char === 'ي' ? '[يى]' : char === 'ه' ? '[هة]' : char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return letter + (/\p{Script=Arabic}/u.test(char) ? '[\u064b-\u065f\u0670\u0640]*' : '')
    }).join('')
    const value = JSON.stringify(pattern)
    return `or(name_ar.imatch.${value},name_en.imatch.${value})`
  })
  return { and: `(${clauses.join(',')})`, limit: '40' }
}

export function matchesProduct(product: Product, query: string) {
  const text = normalizeSearch([product.nameAr, product.nameEn, product.categoryLabel,
    product.description ?? '', ...product.variants.map(variant => variant.label)].join(' '))
  return product.isActive !== false && normalizeSearch(query).split(' ').every(term => text.includes(term))
}
