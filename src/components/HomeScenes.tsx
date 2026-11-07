'use client'

import Hero from './Hero'
import BestSellers from './BestSellers'
import { selectedSceneProducts } from '@/lib/scene-products'
import { useHomepageServices } from './Storefront'
import type { StoreCatalogue } from '@/types/store'

// Imported only by the homepage route. The persistent store shell owns state
// and services, never the homepage's media or animation component tree.
export default function HomeScenes({ data }: { data: StoreCatalogue }) {
  const { productCache, ...actions } = useHomepageServices()
  const products = productCache.resolve(data.products, data.revision)
  const hero = selectedSceneProducts(products, data.homeSections?.hero, 'hero')
  const bestsellers = selectedSceneProducts(products, data.homeSections?.bestsellers, 'bestsellers')
  return <>{hero.length > 0 && <Hero products={hero} {...actions} />}<BestSellers products={bestsellers} {...actions} /></>
}
