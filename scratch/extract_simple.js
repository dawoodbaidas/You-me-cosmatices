const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
const start=s.indexOf('$S');
const arrStart=s.indexOf('[', start);
let d=0,end=-1;
for(let i=arrStart;i<s.length;i++){
  if(s[i]==='[') d++;
  else if(s[i]===']'){ d--; if(d===0){ end=i; break; } }
}
if(end<0) process.exit(1);
const code=s.slice(arrStart,end+1);
// do minimal replacements
let fixed=code;
fixed=fixed.replace(/image\s*:\s*([A-Za-z0-9_]+)\b/g, 'image:"$1.webp"');
// remove trailing commas? sometimes cause issues - be conservative
const vm=require('vm');
const sandbox={};
try{
  vm.runInNewContext('var arr='+fixed, sandbox);
  fs.writeFileSync('products_mini.json', JSON.stringify(sandbox.arr,null,2));
  console.log('ok'+sandbox.arr.length);
}catch(e){ console.error('e'); }
