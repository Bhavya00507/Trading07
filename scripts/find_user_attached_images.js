// d:\Trading07\scripts\find_user_attached_images.js
const fs = require('fs');
const path = require('path');

function searchAll(dir, maxDepth = 6, depth = 0) {
  if (depth > maxDepth) return [];
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const fullPath = path.join(dir, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(searchAll(fullPath, maxDepth, depth + 1));
        } else if (item.endsWith('.png') || item.endsWith('.jpg') || item.endsWith('.webp') || item.endsWith('.jpeg')) {
          results.push({ path: fullPath, size: stat.size, mtime: stat.mtimeMs });
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

const root = `C:\\Users\\bhavy\\.gemini`;
const allMedia = searchAll(root);
allMedia.sort((a, b) => b.mtime - a.mtime);

console.log('Most recent 15 media files in C:\\Users\\bhavy\\.gemini:');
allMedia.slice(0, 15).forEach(m => {
  console.log(`  ${m.path} (${m.size} bytes) - ${new Date(m.mtime).toISOString()}`);
});
