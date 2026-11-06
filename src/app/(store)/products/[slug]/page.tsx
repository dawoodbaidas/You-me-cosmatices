import { notFound } from 'next/navigation'
import { getStoreCatalogue } from '@/lib/store-catalogue'
import { StorePage } from '@/components/Storefront'
export default async function Page({params}: {params: Promise<{slug:string}>}) {
 const {slug: raw}=await params
 // Next keeps non-ASCII segments percent-encoded in this build; slugs in the
 // database are stored decoded, so normalise before comparing.
 const slug=decodeURIComponent(raw)
 const catalogue=await getStoreCatalogue()
 if (!catalogue.products.some(product => product.slug === slug) && !catalogue.unavailable) notFound()
 return <StorePage mode="product" slug={slug} data={catalogue} />
}
