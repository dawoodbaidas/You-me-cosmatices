import { notFound, redirect } from 'next/navigation'
import { StorePage } from '@/components/Storefront'
import { getStoreCatalogue, publicDatabaseConfig } from '@/lib/store-catalogue'
import { categoryPath, findCollection, storeCollections } from '@/lib/store-categories'

export const revalidate = 0

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ path: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await params).path
  let path: string[]
  try { path = raw.map(segment => decodeURIComponent(segment)) } catch { notFound() }
  const catalogue = await getStoreCatalogue()
  const requested = '/categories/' + path.map(encodeURIComponent).join('/')
  let category = catalogue.categories.find(item => categoryPath(item, catalogue.categories) === requested)
  if (!category && !catalogue.unavailable) {
    const config = publicDatabaseConfig()
    if (config) {
      const response = await fetch(`${config.url}/rest/v1/category_paths?path=eq.${encodeURIComponent(path.join('/'))}&select=category_id`, { headers: config.headers, cache: 'no-store' })
      if (!response.ok) throw new Error('Category history unavailable')
      const rows = await response.json() as { category_id: string }[]
      category = catalogue.categories.find(item => item.id === rows[0]?.category_id)
      if (category && findCollection(storeCollections(catalogue.categories, catalogue.products), category.slug)) {
        const query = new URLSearchParams()
        for (const [key, value] of Object.entries(await searchParams)) for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, entry)
        redirect(categoryPath(category, catalogue.categories) + (query.size ? '?' + query : ''))
      }
    }
    notFound()
  }
  if (category && !findCollection(storeCollections(catalogue.categories, catalogue.products), category.slug)) notFound()
  return <StorePage mode="category" slug={category?.slug} />
}
