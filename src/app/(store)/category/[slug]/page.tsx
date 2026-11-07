import { notFound, redirect } from 'next/navigation'
import { StorePage } from '@/components/Storefront'
import { getStoreProducts, getStoreNavigation } from '@/lib/store-catalogue'
import { storeCollections, findCollection } from '@/lib/store-categories'

// Keep revision checks fresh without overriding the catalogue's explicit cache.
export const revalidate = 0

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getStoreNavigation()

  const collection = findCollection(storeCollections(result.categories, result.products), slug)
  if (slug !== 'all' && !collection && !result.unavailable) notFound()
  if (collection?.href) redirect(collection.href)

  return <StorePage routePath={`/category/${encodeURIComponent(slug)}`} mode="category" slug={slug} data={await getStoreProducts('all')} />
}
