import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
const { default: puppeteer } = await import(pathToFileURL('C:/Users/ONE BY ONE/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js').href)
const phase = process.argv[2] || 'before'
const dir = 'artifacts/desktop-v5'
await mkdir(dir, { recursive: true })
const browser = await puppeteer.launch({ headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const report = { phase, widths:[], errors:[] }
try {
 const page = await browser.newPage()
 page.on('pageerror', e => report.errors.push(e.message))
 for (const width of phase === 'before' ? [360,390,430] : [360,390,430,768,1024,1280,1440,1920]) {
  await page.setViewport({width,height:1000,deviceScaleFactor:1})
  await page.goto('http://localhost:3010',{waitUntil:'networkidle0'})
  await page.evaluate(() => document.fonts.ready)
  if (width>=1024) assert.ok(await page.$eval('.desktop-campaign',el=>el.getBoundingClientRect().width)>width*.9,'desktop canvas collapsed')
  await new Promise(r=>setTimeout(r,3500))
  // Hide only the Next.js development indicator, which is outside the storefront.
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'})
  const record = { width, screenshots:[] }
  for (const [name,id,offset] of [['hero','home',0],['arc','bestsellers',0],['arc-mid','bestsellers',220],['cards','shop',230]]) {
   await page.evaluate(({id,offset})=>window.scrollTo({top:document.getElementById(id).getBoundingClientRect().top+scrollY-100+offset,behavior:'instant'}),{id,offset})
   await new Promise(r=>setTimeout(r,1200))
   const path = `${dir}/${phase}-${width}-${name}.png`
   await page.screenshot({path})
   record.screenshots.push(path)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width} ${name}`)
   if (phase==='after' && width<500) {
    const before = await sharp(await readFile(`${dir}/before-${width}-${name}.png`)).raw().toBuffer()
    const after = await sharp(await readFile(path)).raw().toBuffer()
    let changed=0
    for(let i=0;i<before.length;i++) if(Math.abs(before[i]-after[i])>12) changed++
    record[`${name}ChangedFraction`]=changed/before.length
    assert.ok(changed/before.length<.002,`mobile changed ${width} ${name}: ${changed/before.length}`)
   }
  }
  if(width>=1024) await page.screenshot({path:`${dir}/${phase}-${width}-full.png`,fullPage:true})
  assert.equal(await page.$$eval('.arc-card',els=>els.length),6)
  report.widths.push(record)
 }
 assert.deepEqual(report.errors,[])
 await writeFile(`${dir}/${phase}-report.json`,JSON.stringify(report,null,2))
 console.log(JSON.stringify(report,null,2))
} finally {await browser.close()}
