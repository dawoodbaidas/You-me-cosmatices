import Storefront from '@/components/Storefront'
import { getStoreNavigation } from '@/lib/store-catalogue'
import { StoreNavigation } from '@/components/StoreNavigation'

// Prices must never be baked into a static build: read them on every request.
export const revalidate = 0

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const store = await getStoreNavigation()

  return (
    <>
      <StoreNavigation><Storefront settings={store.settings} categories={store.categories} storeRevision={store.revision} storeUnavailable={store.unavailable}>{children}</Storefront></StoreNavigation>
    </>
  )
}
