const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
const start=s.indexOf('$S');
const arrStart=s.indexOf('[', start);
// better to find from the actual products - look for first id:
const first=s.indexOf('id:"package-laverne-you-miracle"', start);
if(first>0){
  // find [ before this?
}
let depth=0;
let end=-1;
for(let i=arrStart;i<s.length;i++){
  if(s[i]==='[') depth++;
  else if(s[i]===']'){
    depth--;
    if(depth===0){ end=i; break; }
  }
}
if(end===-1){ console.log('no'); process.exit(); }
const arrStr=s.slice(arrStart, end+1);
// clean
try{
  const vm=require('vm');
  const ctx={};
  vm.runInNewContext('var arr='+arrStr, ctx);
  fs.writeFileSync('products_parsed.json', JSON.stringify(ctx.arr,null,2));
  console.log(ctx.arr.length);
}catch(e){ console.log('err'); }
