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
// collect base64 image assignments
const re=/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*"data:image\/[^"]+"/g;
let m; const imgs={};
while((m=re.exec(s))!==null){
  imgs[m[1]]=m[0].split('=')[1].trim().replace(/^"/,'').replace(/"$/,'');
}
fs.writeFileSync('img_map.json', JSON.stringify(imgs,null,2));
console.log(Object.keys(imgs).length);
