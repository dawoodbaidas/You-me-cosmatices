const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
const start=s.indexOf('$S');
const arrStart=s.indexOf('[', start);
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
fs.writeFileSync('products_raw.json', arrStr);
console.log('ok', arrStr.length);
