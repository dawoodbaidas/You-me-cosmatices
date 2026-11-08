'use client'

import Hero from './Hero'
import BestSellers from './BestSellers'
import { selectedSceneProducts, productSceneAsset } from '@/lib/scene-products'
import { getImageProps } from 'next/image'
import { preload } from 'react-dom'
import { PRODUCT_IMAGE_QUALITY, PRODUCT_IMAGE_SIZES } from '@/lib/product-media'
import { useHomepageServices } from './Storefront'
import type { StoreCatalogue } from '@/types/store'

// Imported only by the homepage route. The persistent store shell owns state
// and services, never the homepage's media or animation component tree.
export default function HomeScenes({ data }: { data: StoreCatalogue }) {
  const { productCache, ...actions } = useHomepageServices()
  const products = productCache.resolve(data.products, data.revision)
  const hero = selectedSceneProducts(products, data.homeSections?.hero, 'hero')
  const bestsellers = selectedSceneProducts(products, data.homeSections?.bestsellers, 'bestsellers')
  const first = bestsellers[0]
  const src = first && (productSceneAsset(first)?.src ?? first.imageUrl)
  if (src) {
    const { props } = getImageProps({ src, alt: '', fill: true, sizes: PRODUCT_IMAGE_SIZES.scene, quality: PRODUCT_IMAGE_QUALITY })
    preload(props.src, { as: 'image', imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: 'low' })
  }
  return <>{hero.length > 0 && <Hero products={hero} {...actions} />}<BestSellers products={bestsellers} {...actions} /></>
}
