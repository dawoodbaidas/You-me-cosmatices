const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
// extract from after $S = [ up to matching ]
const idx=s.indexOf('$S');
const a=s.indexOf('[', idx);
let d=0,end=-1;
for(let i=a;i<s.length;i++){
  if(s[i]==='[') d++;
  else if(s[i]===']'){ d--; if(d===0){ end=i; break; } }
}
if(end<0) process.exit(1);
const code=s.slice(a,end+1);
try{
  // wrap in parens
  const arr=eval('('+code+')');
  fs.writeFileSync('products_parsed.json', JSON.stringify(arr,null,2));
  console.log(arr.length);
}catch(e){
  console.error(e.toString());
}
