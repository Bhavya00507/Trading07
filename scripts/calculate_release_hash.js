// d:\Trading07\scripts\calculate_release_hash.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const zipPath = `D:\\Trading07\\releases\\Quantum-Terminal-Buyer-Release-v1.0.zip`;

if (fs.existsSync(zipPath)) {
  const buffer = fs.readFileSync(zipPath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`Zip Path: ${zipPath}`);
  console.log(`Zip Size: ${sizeMb} MB (${buffer.length} bytes)`);
  console.log(`Zip SHA256: ${hash}`);
} else {
  console.error(`Zip file not found at ${zipPath}`);
}
