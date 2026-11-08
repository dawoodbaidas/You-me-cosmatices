import Storefront from '@/components/Storefront'
import { getStoreNavigation } from '@/lib/store-catalogue'
import { StoreNavigation } from '@/components/StoreNavigation'
import Footer from '@/components/Footer'

// Prices must never be baked into a static build: read them on every request.
export const revalidate = 0

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const store = await getStoreNavigation()

  return (
    <>
      <StoreNavigation><Storefront settings={store.settings} categories={store.categories} storeRevision={store.revision} storeUnavailable={store.unavailable} footer={<Footer settings={store.settings}/>}>{children}</Storefront></StoreNavigation>
    </>
  )
}
