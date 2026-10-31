const fs=require('fs');const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/lib/taxonomy.ts',s=>s+`
export function selectHeroProducts(products: Product[]): Product[] {
 const available = products.filter(p => p.isActive !== false && p.imageUrl)
 const used = new Set<string>()
 return buildTaxonomy(available).filter(g => g.id !== 'other').flatMap(group => {
  const candidates = available.filter(p => group.productIds.includes(p.id))
  const product = candidates.find(p => !used.has(p.id) && p.isFeatured) ?? candidates.find(p => !used.has(p.id)) ?? candidates[0]
  if (!product) return []
  used.add(product.id)
  return [product]
 })
}
`);
edit('src/components/MobileHero.tsx',s=>s.replace("import type { Product }","import { selectHeroProducts } from '@/lib/taxonomy'\nimport type { Product }").replace(/ const select=.*\n const central=.*\n const items=.*\n/, " const featured=selectHeroProducts(products)\n const central=featured[0]\n const items=featured.slice(1)\n").replace('progress-index*.075)/.18','progress-index*.035)/.13').replace("card.style.pointerEvents=enter>.9&&leave<.8?'auto':'none';card.tabIndex=enter>.9&&leave<.8?0:-1","card.style.pointerEvents='auto';card.tabIndex=0"));
edit('src/components/editorial-motion.css',s=>s.replace('object-fit:cover; object-position:15% center; transform:scale(1.2);','object-fit:contain; object-position:center; transform:none;').replace('.semicircle-card img { object-fit:cover; }','.semicircle-card img { object-fit:contain; }')+`
.editorial-small-4 { left:3%; top:42%; }
.editorial-small-5 { right:3%; top:42%; }
.editorial-glow,.editorial-base,.editorial-spark,.editorial-word { pointer-events:none; }
`);
