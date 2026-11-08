export type ProductFrame = {
  width: number; height: number
  subject: { x: number; y: number; width: number; height: number }
  transparent: boolean
  background: string | null
}

/** Inspect decoded pixels, never file extensions or the colour of the product. */
export function measureProductFrame(pixels: Uint8ClampedArray, width: number, height: number): ProductFrame {
  let left=width, top=height, right=-1, bottom=-1, clear=0, clearEdge=0, edgeCount=0
  const edges: number[][]=[[],[],[]]
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const i=(y*width+x)*4, alpha=pixels[i+3], edge=x===0||y===0||x===width-1||y===height-1
    if(alpha>0) { left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x); bottom=Math.max(bottom,y) }
    if(alpha<8) clear++
    if(edge) {
      edgeCount++
      if(alpha<8) clearEdge++
      if(alpha>247) for(let c=0;c<3;c++) edges[c].push(pixels[i+c])
    }
  }
  const transparent=right>=left&&clear>width*height*.02&&clearEdge>edgeCount*.5
  const x=Math.max(0,left-1), y=Math.max(0,top-1)
  const subject=transparent ? {x,y,width:Math.min(width,right+2)-x,height:Math.min(height,bottom+2)-y} : {x:0,y:0,width,height}
  // An opaque advert keeps every pixel; its edge colour fills any letterboxing.
  const background=!transparent&&edges[0].length ? `rgb(${edges.map(channel=>channel.sort((a,b)=>a-b)[Math.floor(channel.length/2)]).join(', ')})` : null
  return {width,height,subject,transparent,background}
}

const cache=new Map<string,ProductFrame>()
const storageKey='you-me-product-frames-v1'
let hydrated=false
export function cachedProductFrame(source: string) {
  if(!hydrated&&typeof window!=='undefined') {
    hydrated=true
    try {
      const saved=JSON.parse(localStorage.getItem(storageKey)??'[]') as [string,ProductFrame][]
      for(const [key,frame] of saved.slice(-100)) if(frame.width>0&&frame.height>0&&frame.subject?.width>0&&frame.subject?.height>0) cache.set(key,frame)
    } catch { /* Storage is optional; failed reads retain whole-image framing. */ }
  }
  return cache.get(source)
}
export function saveProductFrame(source: string,frame: ProductFrame) {
  cache.delete(source);cache.set(source,frame)
  if(cache.size>100)cache.delete(cache.keys().next().value!)
  try { localStorage.setItem(storageKey,JSON.stringify([...cache])) } catch { /* Private browsing can disable storage. */ }
}
