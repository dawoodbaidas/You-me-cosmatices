import Storefront from '@/components/Storefront'
import { getCatalogue } from '@/lib/products/queries'
import { getStoreCatalogue } from '@/lib/store-catalogue'

// Prices must never be baked into a static build: read them on every request.
export const revalidate = 0

export default async function HomePage() {
  // The two editorial scenes retain their original source and selection logic.
  const [scenes, store] = await Promise.all([getCatalogue(), getStoreCatalogue()])

  return (
    <>
      <Storefront products={store.products} settings={store.settings} categories={store.categories} storeRevision={store.revision} storeUnavailable={store.unavailable}
        sceneProducts={scenes.status === 'ok' ? scenes.products : []} sceneCurrency={scenes.status === 'ok' ? scenes.settings.currency : ''} />
    </>
  )
}
