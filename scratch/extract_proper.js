const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
// find $S array
const idx=s.indexOf('$S');
const arrStart=s.indexOf('[', idx);
let d=0,end=-1;
for(let i=arrStart;i<s.length;i++){
  if(s[i]==='[') d++;
  else if(s[i]===']'){ d--; if(d===0){ end=i; break; } }
}
const code=s.slice(arrStart,end+1);
// build img map
const imgs={};
const reImg=/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*"data:image\/[^"]+"/g;
let m;
while((m=reImg.exec(s))!==null){
  const val=m[0].split('=')[1].trim();
  imgs[m[1]]=val.slice(1,-1);
}
// replace images
let fixed=code;
Object.keys(imgs).forEach(k=>{
  fixed=fixed.replace(new RegExp('image\\s*:\\s*'+k+'\\b','g'), 'image:"'+k+'.webp"');
});
// also handle other bare vars that might be in values? common ones are image vars, others less common
const vm=require('vm');
try{
  const sandbox={};
  vm.runInNewContext('var arr='+fixed, sandbox);
  const arr=sandbox.arr;
  // add image data
  arr.forEach(p=>{
    if(p.image && p.image.endsWith('.webp')){
      const key=p.image.slice(0,-5);
      if(imgs[key]){ p.imageData=imgs[key]; p.imageFile=p.id+'.webp'; }
    }
  });
  fs.writeFileSync('products_extracted.json', JSON.stringify(arr,null,2));
  console.log(arr.length);
}catch(e){ console.error('err'); }
