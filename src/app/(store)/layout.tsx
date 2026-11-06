import Storefront from '@/components/Storefront'
import { getStoreNavigation } from '@/lib/store-catalogue'

// Prices must never be baked into a static build: read them on every request.
export const revalidate = 0

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const store = await getStoreNavigation()

  return (
    <>
      <Storefront settings={store.settings} categories={store.categories} storeRevision={store.revision} storeUnavailable={store.unavailable}>{children}</Storefront>
    </>
  )
}
