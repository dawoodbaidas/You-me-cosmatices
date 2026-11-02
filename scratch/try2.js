const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
const start=s.indexOf('const $S');
const arrStart=s.indexOf('[', start);
let depth=0, end=-1;
for(let i=arrStart;i<s.length;i++){
  if(s[i]==='[') depth++;
  else if(s[i]===']'){ depth--; if(depth===0){ end=i; break; } }
}
if(end==-1) process.exit(1);
const slice=s.slice(arrStart,end+1);
const escaped = slice.replace(/<script[^>]*>/g,'').replace(/<\/script>/g,'');
// try
try{
  const vm=require('vm');
  const ctx={};
  vm.runInThisContext('var x='+slice, ctx); // better in same?
}catch(e){}
try{
  const ctx={}; require('vm').runInNewContext('var arr='+slice, ctx); fs.writeFileSync('products_parsed.json',JSON.stringify(ctx.arr)); console.log(ctx.arr.length);
}catch(e){ console.error('e'); }
