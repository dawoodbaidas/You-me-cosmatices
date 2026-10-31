const fs = require('fs');
const s = fs.readFileSync('You-Cosmetics.html', 'utf8');

// Build image map
const imgs = {};
const reImg = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*"data:image\/[^"]+"/g;
let m;
while ((m = reImg.exec(s)) !== null) {
  const val = m[0].split('=')[1].trim();
  imgs[m[1]] = val.slice(1, -1);
}

// Find products array
const start = s.indexOf('$S');
if (start === -1) { console.error('no $S'); process.exit(1); }
const arrStart = s.indexOf('[', start);
if (arrStart === -1) { console.error('no ['); process.exit(1); }
let d = 0, end = -1;
for (let i = arrStart; i < s.length; i++) {
  if (s[i] === '[') d++;
  else if (s[i] === ']') {
    d--;
    if (d === 0) { end = i; break; }
  }
}
if (end < 0) { console.error('no end'); process.exit(1); }
const code = s.slice(arrStart, end + 1);

// Replace image variable refs with string filenames
let fixed = code;
const keys = Object.keys(imgs);
for (let i = 0; i < keys.length; i++) {
  const k = keys[i];
  // replace image:kW, and image:kW}
  fixed = fixed.replace(new RegExp('image\\s*:\\s*' + k + '\\b', 'g'), 'image:"' + k + '.webp"');
}

// Also fix other potential bare refs - but main issue is images
// Try eval
try {
  const vm = require('vm');
  const sandbox = {};
  vm.runInNewContext('var arr=' + fixed, sandbox);
  const arr = sandbox.arr;
  for (let i = 0; i < arr.length; i++) {
    const p = arr[i];
    if (p.image && typeof p.image === 'string' && p.image.endsWith('.webp')) {
      const key = p.image.slice(0, -5);
      if (imgs[key]) {
        p.imageData = imgs[key];
        p.imageFile = p.id + '.webp';
      }
    }
  }
  fs.writeFileSync('products_final.json', JSON.stringify(arr, null, 2), 'utf8');
  console.log('ok:' + arr.length);
} catch (e) {
  console.error('err');
}
