const fs=require('fs');
const s=fs.readFileSync('You-Cosmetics.html','utf8');
const idx=s.indexOf('$S');
console.log(idx>=0?idx:'no');
