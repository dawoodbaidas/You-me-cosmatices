import assets from '@/data/scene-assets.json'
import type { Product } from '@/types/product'
import type { ScenePalette } from './scene-palette'

export type SceneAsset = ScenePalette & {
  src: string; source: string; width: number; height: number
  bounds: { x: number; y: number; width: number; height: number }
}
export const sceneAssets = assets as unknown as Record<string, SceneAsset>
export const productSceneAsset = (product: Product) => sceneAssets[product.slug]?.source === product.imageUrl ? sceneAssets[product.slug] : undefined

export function selectedSceneProducts(products: Product[], ids: string[] | undefined, section: 'hero' | 'bestsellers') {
  if (ids === undefined) return section === 'hero' ? heroProducts(products) : showcaseProducts(products)
  return ids.flatMap(id => products.find(product => product.id === id && product.isActive !== false && product.imageUrl) ?? [])
}
const heroOrder = ['body-mist', 'aloe-foam', 'foundation', 'mascara', 'musk-tahara-oil']

export function heroProducts(products: Product[]) {
  const active = products.filter(p => p.isActive !== false && p.imageUrl)
  const chosen = heroOrder.flatMap(slug => active.find(p => p.slug === slug) ?? [])
  return [...chosen, ...active.filter(p => !chosen.some(item => item.id === p.id))].slice(0, 5)
}

export function showcaseProducts(products: Product[]) {
  const active = products.filter(p => p.isActive !== false && p.imageUrl)
  const cutouts = active.filter(p => sceneAssets[p.slug])
  if (!cutouts.length) return active.filter(p => p.isFeatured).slice(0, 6)
  // Curate the photographed cutouts without changing catalogue records or featured flags.
  const ordered = heroOrder.flatMap(slug => cutouts.find(p => p.slug === slug) ?? [])
  return [...ordered, ...cutouts.filter(p => !ordered.some(item => item.id === p.id))].slice(0, 6)
}
