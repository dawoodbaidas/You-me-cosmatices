const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
// img map
const imgs={};
const reImg=/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*"data:image\/[^"]+"/g;
let m;
while((m=reImg.exec(s))!==null){
  const val=m[0].split('=')[1].trim();
  imgs[m[1]]=val.slice(1,-1);
}
// extract array
const start=s.indexOf('$S');
const arrStart=s.indexOf('[', start);
let d=0,end=-1;
for(let i=arrStart;i<s.length;i++){
  if(s[i]==='[') d++; else if(s[i]===']'){ d--; if(d===0){ end=i; break; } }
}
if(end<0) process.exit(1);
const code=s.slice(arrStart,end+1);
// replace image vars with quoted strings for common ids
let fixed=code;
for(const k of Object.keys(imgs)){
  // replace image: kW (no quotes)
  fixed = fixed.split('image:'+k+',').join('image:"'+k+'.webp",');
  fixed = fixed.split('image:'+k+'}').join('image:"'+k+'.webp"}');
}
const vm=require('vm');
const sandbox={};
try{
  vm.runInNewContext('var arr='+fixed, sandbox);
  const arr=sandbox.arr;
  arr.forEach(p=>{
    if(p.image && p.image.endsWith('.webp')){
      const key=p.image.slice(0,-5);
      if(imgs[key]) p.imageData=imgs[key];
    }
  });
  fs.writeFileSync('products_final.json', JSON.stringify(arr,null,2));
  console.log(arr.length);
}catch(e){
  console.error('err');
}
