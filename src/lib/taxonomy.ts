import type { Product } from '@/types/product'

export interface Collection { id: string; label: string; productIds: string[]; children: Collection[] }

type Rule = { id: string; label: string; matches: (p: Product) => boolean; children?: Rule[] }
const labelHas = (pattern: RegExp) => (p: Product) => pattern.test(p.categoryLabel)
const slugIs = (...slugs: string[]) => (p: Product) => slugs.includes(p.slug)
const men = labelHas(/رجال/)
const women = (p: Product) => /نسائ/.test(p.categoryLabel) || p.slug === 'boutique-baby-powder'
const fragrance = (p: Product) => p.category === 'mist' || /عطور|معطرات الجسم/.test(p.categoryLabel)
const bags = labelHas(/الحقائب|الإكسسوارات الرجالية/)
const gifts = (p: Product) => /باقات|باكيجات|مجموعات العناية/.test(p.categoryLabel) || p.slug === 'boutique-baby-powder'
const makeup = (p: Product) => (p.category === 'makeup' || p.category === 'lips') && p.slug !== 'eye-mask'
const care = (p: Product) => (/العناية|البشرة|الوجه|الجسم|اليدين|القدمين|الاستحمام|العرق|الشمس|تونر|أجهزة/.test(p.categoryLabel) || p.slug === 'eye-mask' || p.slug === 'baby-powder-pink-brightening-cream') && !fragrance(p) && !bags(p) && !gifts(p)

const rules: Rule[] = [
 { id:'men', label:'رجالي', matches:men, children:[{id:'men-fragrance',label:'العطور',matches:p=>men(p)&&fragrance(p)},{id:'men-accessories',label:'الشنط والمحافظ',matches:p=>men(p)&&bags(p)}] },
 { id:'women', label:'نسائي', matches:women, children:[{id:'women-fragrance',label:'العطور',matches:p=>women(p)&&fragrance(p)}] },
 { id:'fragrance', label:'العطور', matches:fragrance, children:[{id:'fragrance-men',label:'رجالي',matches:p=>fragrance(p)&&men(p)},{id:'fragrance-women',label:'نسائي',matches:p=>fragrance(p)&&women(p)},{id:'fragrance-other',label:'عطور ومسك',matches:p=>fragrance(p)&&!men(p)&&!women(p)}] },
 { id:'makeup', label:'المكياج', matches:makeup, children:[{id:'lips',label:'منتجات الشفاه',matches:slugIs('lipstick-set','lip-liner-marker-rm','lip-oil','sence-lip-balm','moist-lip')},{id:'lipstick',label:'روج',matches:slugIs('lipstick-set')},{id:'mascara',label:'مسكارا',matches:slugIs('mascara','essence-mascara')},{id:'foundation',label:'كريم أساس',matches:slugIs('foundation','bb-7in1-foundation')},{id:'blush',label:'بلاشر',matches:slugIs('blush-palette')},{id:'eye',label:'مكياج العيون',matches:slugIs('eyebrow-pencil')}] },
 { id:'care', label:'العناية', matches:care, children:[{id:'body',label:'العناية بالجسم',matches:p=>care(p)&&/الجسم|الاستحمام|القدمين|اليدين|العرق/.test(p.categoryLabel)},{id:'skin',label:'العناية بالبشرة',matches:p=>care(p)&&!/الجسم|الاستحمام|القدمين|اليدين|العرق|أجهزة/.test(p.categoryLabel)},{id:'devices',label:'أجهزة العناية',matches:p=>care(p)&&/أجهزة/.test(p.categoryLabel)}] },
 { id:'bags', label:'الشنط والمحافظ', matches:bags, children:[{id:'wallets',label:'المحافظ',matches:slugIs('dovis-leather-classical-mens-wallet','mens-classic-leather-wallet')},{id:'handbags',label:'الشنط',matches:slugIs('mens-waterproof-crossbody-bag','mens-crossbody-bag-usb')}] },
 { id:'gifts', label:'الهدايا والبكجات', matches:gifts },
]

export function buildTaxonomy(products: Product[]): Collection[] {
 const build = (rule: Rule): Collection => ({ id:rule.id, label:rule.label, productIds:products.filter(rule.matches).map(p=>p.id), children:(rule.children ?? []).map(build).filter(c=>c.productIds.length>0) })
 const result = rules.map(build).filter(c=>c.productIds.length>0)
 const assigned = new Set(result.flatMap(c=>c.productIds))
 const other = products.filter(p=>!assigned.has(p.id))
 if(other.length) result.push({id:'other',label:'غير مصنف',productIds:other.map(p=>p.id),children:[]})
 return result
}

export function findCollection(groups: Collection[], id: string | null): Collection | undefined {
 for(const group of groups) { if(group.id===id) return group; const child=group.children.find(c=>c.id===id); if(child) return child }
}

export function collectionHref(id: string | null): string {
 return `/category/${id === 'fragrance' ? 'perfumes' : encodeURIComponent(id ?? 'all')}`
}

export function collectionFromSlug(groups: Collection[], slug: string): Collection | undefined {
 const collection = findCollection(groups, slug === 'perfumes' ? 'fragrance' : slug)
 return collection && collectionHref(collection.id) === `/category/${slug}` ? collection : undefined
}

export function selectHeroProducts(products: Product[]): Product[] {
 const available = products.filter(p => p.isActive !== false && p.imageUrl)
 const used = new Set<string>()
 return buildTaxonomy(available).filter(g => g.id !== 'other').flatMap(group => {
  const candidates = available.filter(p => group.productIds.includes(p.id))
  const product = candidates.find(p => !used.has(p.id) && p.isFeatured) ?? candidates.find(p => !used.has(p.id)) ?? candidates[0]
  if (!product) return []
  used.add(product.id)
  return [product]
 })
}
