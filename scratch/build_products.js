const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
const start=s.indexOf('$S');
const arrStart=s.indexOf('[', start);
let d=0,end=-1;
for(let i=arrStart;i<s.length;i++){
  if(s[i]==='[') d++; else if(s[i]===']'){ d--; if(d===0){ end=i; break; } }
}
if(end<0) process.exit(1);
const code=s.slice(arrStart,end+1);
// img map
const imgs={};
const reImg=/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*"data:image\/[^"]+"/g;
let m;
while((m=reImg.exec(s))!==null){
  imgs[m[1]]=m[0].split('=')[1].trim().replace(/^"/,'').replace(/"$/,'');
}
// eval products with proxy for image vars
const vm=require('vm');
const sandbox={console, Math};
vm.runInNewContext('var arr='+code, sandbox);
// sandbox.arr has products with image: kW etc - replace
const arr=sandbox.arr;
arr.forEach(p=>{
  if(p.image && typeof p.image==='string' && imgs[p.image]){
    p.imageData=imgs[p.image];
    p.imageFile=p.id+'.webp'; // best guess
  }
});
fs.writeFileSync('products_with_imgs.json', JSON.stringify(arr,null,2));
console.log(arr.length);
