// d:\Trading07\scripts\find_latest_media.js
const fs = require('fs');
const path = require('path');

const dir = `C:\\Users\\bhavy\\.gemini\\antigravity-ide\\brain\\4671aca4-015a-4c35-962d-921f037f002c\\.tempmediaStorage`;
const files = fs.readdirSync(dir).map(f => {
  const p = path.join(dir, f);
  const stat = fs.statSync(p);
  return { name: f, path: p, size: stat.size, mtime: stat.mtimeMs };
});

files.sort((a, b) => b.mtime - a.mtime);

console.log('Latest 5 media files:');
files.slice(0, 5).forEach(f => {
  console.log(`  ${f.name} (${f.size} bytes) - ${new Date(f.mtime).toISOString()}`);
});
