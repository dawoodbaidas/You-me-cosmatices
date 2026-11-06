import { StorePage } from '@/components/Storefront'
import { getStoreCatalogue } from '@/lib/store-catalogue'
export default async function Page() { return <StorePage mode="home" data={await getStoreCatalogue()} /> }
