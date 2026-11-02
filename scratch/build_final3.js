const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
const imgs={};
const reImg=/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*"data:image\/[^"]+"/g;
let m;
while((m=reImg.exec(s))!==null){
  const val=m[0].split('=')[1].trim();
  imgs[m[1]]=val.slice(1,-1);
}
const idx=s.indexOf('$S');
const arrStart=s.indexOf('[',idx);
let d=0,end=-1;
for(let i=arrStart;i<s.length;i++){
  if(s[i]==='[') d++;
  else if(s[i]===']'){ d--; if(d===0){ end=i; break; } }
}
const code=s.slice(arrStart,end+1);
let fixed=code;
Object.keys(imgs).forEach(k=>{
  fixed=fixed.replace(new RegExp('image\\s*:\\s*'+k+'\\b','g'), 'image:"'+k+'.webp"');
});
// replace common undefined vars in values if any - but skip, easier to fix after
// try
const vm=require('vm');
const sandbox={};
try{
  vm.runInNewContext('var arr='+fixed, sandbox);
  const arr=sandbox.arr.filter(p=>p && p.id && p.id!=='skincare' && p.id!=='makeup' && p.id!=='lips' && p.id!=='mist' && p.id!=='packages' && p.id!=='bestseller' && p.id!=='skincare-body');
  arr.forEach(p=>{
    if(p.image && p.image.endsWith('.webp')){
      const key=p.image.slice(0,-5);
      if(imgs[key]){ p.imageData=imgs[key]; p.imageFile=p.id+'.webp'; }
    }
  });
  fs.writeFileSync('products_clean.json', JSON.stringify(arr,null,2));
  console.log(arr.length);
}catch(e){ console.error(e.toString()); }
