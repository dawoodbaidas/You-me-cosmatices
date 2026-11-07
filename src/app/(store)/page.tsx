import { StorePage } from '@/components/Storefront'
import { getStoreHome } from '@/lib/store-catalogue'
import HomeScenes from '@/components/HomeScenes'
export default async function Page() { const data = await getStoreHome(); return <StorePage routePath="/" mode="home" data={data}><HomeScenes data={data} /></StorePage> }
