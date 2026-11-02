import { notFound } from 'next/navigation'
import Storefront from '@/components/Storefront'
import { getStoreCatalogue } from '@/lib/store-catalogue'
import { storeCollections, findCollection } from '@/lib/store-categories'

// Keep revision checks fresh without overriding the catalogue's explicit cache.
export const revalidate = 0

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getStoreCatalogue()

  const collection = findCollection(storeCollections(result.categories, result.products), slug)
  if (slug !== 'all' && !collection && result.revision !== null) notFound()

  // Keep the full catalogue available to resolve cart lines across departments.
  return <Storefront key={slug} products={result.products} settings={result.settings} categories={result.categories} categoryId={slug} storeRevision={result.revision} storeUnavailable={result.unavailable} />
}
