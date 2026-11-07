import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {startStoreBrowserDatabase} from '../tests/helpers/store-browser-server.mjs'
import {browserTestEnvironment,createBrowserWorkspace} from '../tests/helpers/browser-workspace.mjs'
const project=resolve(import.meta.dirname,'..'), fixture=await startStoreBrowserDatabase()
const directory=await createBrowserWorkspace(project), env={...browserTestEnvironment(fixture.url),NODE_ENV:'production'}
// This diagnostic route exists only in the isolated copy, never in the project.
await mkdir(resolve(directory,'src/app/api/qa-performance'),{recursive:true})
await writeFile(resolve(directory,'src/app/api/qa-performance/route.ts'),`import {invalidateStoreCatalogue} from '@/lib/store-cache'
import {prepareCheckout} from '@/app/checkout'
export async function POST(request:Request) {const input=await request.json();if(input.mode==='invalidate'){invalidateStoreCatalogue();return Response.json({ok:true})}return Response.json(await prepareCheckout(input.items,input.expected))}`)
// Component failure/source-replacement checks also live only in the QA copy.
await mkdir(resolve(directory,'src/app/qa-images'),{recursive:true})
await writeFile(resolve(directory,'src/app/qa-images/page.tsx'),`'use client'
import {useState} from 'react'
import ProductMedia from '@/components/ProductMedia'
const sources=['/products/package-laverne-you-miracle.webp','/products/body-mist.png','/missing-product-image.webp']
export default function Page(){const [index,setIndex]=useState(0);return <main><div data-image-fixture={index} style={{position:'relative',width:400,height:500}}><ProductMedia src={sources[index]} alt={'Source '+index} sizes="400px" eager /></div>{sources.map((_,i)=><button key={i} data-source={i} onClick={()=>setIndex(i)}>Source {i}</button>)}</main>}`)
const next=resolve(project,'node_modules/next/dist/bin/next')
const build=spawn(process.execPath,[next,'build','--webpack'],{cwd:directory,env,stdio:'inherit',windowsHide:true})
const [code]=await once(build,'exit');if(code)throw Error('Production build failed')
const child=spawn(process.execPath,[next,'start','--hostname','127.0.0.1','--port','5090'],{cwd:directory,env,stdio:'inherit',windowsHide:true})
console.log(JSON.stringify({directory,database:fixture.url,origin:'http://127.0.0.1:5090'}))
process.on('SIGINT',()=>{child.kill();void fixture.close().then(()=>process.exit())})

