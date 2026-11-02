const fs=require('fs');
const s=fs.readFileSync('products_raw.json','utf8');
// try with vm
const vm=require('vm');
try{
  const ctx={};
  vm.runInNewContext('var x='+s, ctx);
  console.log('ok', ctx.x.length);
}catch(e){
  console.error(e.message);
}
