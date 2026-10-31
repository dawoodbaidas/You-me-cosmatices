const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
// build img map
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
// replace image vars with filenames in the string
let fixed=code;
for(const [k,v] of Object.entries(imgs)){
  // replace bare kW (not quoted) when used as image: kW
  fixed = fixed.replace(new RegExp('image\\s*:\\s*'+k+'\\b', 'g'), 'image:"'+k+'.webp"');
  fixed = fixed.replace(new RegExp('image\\s*:\\s*'+k+',', 'g'), 'image:"'+k+'.webp",');
}
const vm=require('vm');
const sandbox={};
vm.runInNewContext('var arr='+fixed, sandbox);
const arr=sandbox.arr;
arr.forEach(p=>{
  if(p.image && typeof p.image==='string' && p.image.endsWith('.webp')){
    const key=p.image.replace('.webp','');
    if(imgs[key]) p.imageData=imgs[key];
  }
});
fs.writeFileSync('products_final.json', JSON.stringify(arr,null,2));
console.log(arr.length);
