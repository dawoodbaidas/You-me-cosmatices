import { notFound } from 'next/navigation'
import { getStoreCatalogue } from '@/lib/store-catalogue'
import { StorePage } from '@/components/Storefront'
export default async function Page({params}: {params: Promise<{slug:string}>}) {
 const {slug}=await params
 const catalogue=await getStoreCatalogue()
 if (!catalogue.products.some(p=>p.slug===slug) && !catalogue.unavailable) notFound()
 return <StorePage mode="product" slug={slug} />
}