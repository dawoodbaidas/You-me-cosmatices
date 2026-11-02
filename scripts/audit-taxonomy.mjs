import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { buildTaxonomy } from '../src/lib/taxonomy.ts'
import { writeFile, mkdir } from 'node:fs/promises'
nextEnv.loadEnvConfig(process.cwd())
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const {data,error} = await client.from('products').select('id,slug,name_ar,name_en,description,category,category_label,is_active').eq('is_active',true)
if(error) throw error
const products=data.map(p=>({id:p.id,slug:p.slug,nameAr:p.name_ar,nameEn:p.name_en,description:p.description,category:p.category,categoryLabel:p.category_label}))
const groups=buildTaxonomy(products)
const other=groups.find(g=>g.id==='other')
const output={total:products.length,classified:products.length-(other?.productIds.length??0),unclassified:other?.productIds.length??0,unclassifiedProducts:products.filter(p=>other?.productIds.includes(p.id)).map(p=>({id:p.id,slug:p.slug,name:p.nameAr,label:p.categoryLabel})),groups:groups.map(g=>({id:g.id,label:g.label,count:g.productIds.length,children:g.children.map(c=>({id:c.id,label:c.label,count:c.productIds.length}))}))}
await mkdir('artifacts/phase1',{recursive:true})
await writeFile('artifacts/phase1/taxonomy-audit.json',JSON.stringify(output,null,2))
console.log(JSON.stringify(output,null,2))
