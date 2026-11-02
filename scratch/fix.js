const fs=require('fs');
const s=fs.readFileSync('products_raw.json','utf8');
// The original array has JS object notation (unquoted keys sometimes? no in the actual data we saw they use quoted strings like "id": but maybe some got mangled - but we saw from snippet it looks valid)
// Try to parse with Function constructor
try{
  const fn = new Function('return ' + s);
  const arr = fn();
  fs.writeFileSync('products_parsed.json', JSON.stringify(arr, null, 2));
  console.log(arr.length);
}catch(e){
  console.error('err');
}
