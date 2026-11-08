import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {measureProductFrame} from '../src/lib/product-framing.ts'

test('decoded alpha trims only transparent padding and preserves opaque advert pixels',async()=>{
  const rgba=Buffer.alloc(100*100*4)
  for(let y=10;y<90;y++)for(let x=40;x<60;x++){const i=(y*100+x)*4;rgba[i]=240;rgba[i+1]=220;rgba[i+2]=180;rgba[i+3]=255}
  for(const format of ['png','webp']){
    const file=await sharp(rgba,{raw:{width:100,height:100,channels:4}})[format]({lossless:true}).toBuffer()
    const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    const frame=measureProductFrame(new Uint8ClampedArray(data),info.width,info.height)
    assert.equal(frame.transparent,true);assert.equal(frame.background,null)
    assert.ok(frame.subject.width>=20&&frame.subject.width<=22)
    assert.ok(frame.subject.height>=80&&frame.subject.height<=82)
  }
  for(const [width,height,format] of [[100,100,'png'],[60,120,'jpeg'],[160,80,'webp']]){
    const encoded=await sharp({create:{width,height,channels:3,background:'#ffffff'}})[format]().toBuffer()
    const {data,info}=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    const frame=measureProductFrame(new Uint8ClampedArray(data),info.width,info.height)
    assert.equal(frame.transparent,false)
    assert.deepEqual(frame.subject,{x:0,y:0,width,height})
    assert.equal(frame.background,'rgb(255, 255, 255)')
  }
})
test('one transparent pixel and an internal cutout never crop an opaque design',()=>{
  const pixels=new Uint8ClampedArray(40*40*4).fill(255)
  pixels[3]=0
  assert.equal(measureProductFrame(pixels,40,40).transparent,false)
  for(let y=10;y<30;y++)for(let x=10;x<30;x++)pixels[(y*40+x)*4+3]=0
  assert.equal(measureProductFrame(pixels,40,40).transparent,false)
  assert.deepEqual(measureProductFrame(pixels,40,40).subject,{x:0,y:0,width:40,height:40})
})
