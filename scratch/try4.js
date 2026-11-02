const fs=require('fs');
const s=fs.readFileSync('products_raw.json','utf8');
// replace undefined references if any - but maybe just eval in vm with empty context
const vm=require('vm');
const sandbox={};
vm.runInNewContext('var arr='+s, sandbox);
fs.writeFileSync('products_final.json', JSON.stringify(sandbox.arr,null,2));
console.log(sandbox.arr.length);
