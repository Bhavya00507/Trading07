// d:\Trading07\scripts\assemble_buyer_package.js
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgDir = path.join(rootDir, 'Quantum-Terminal-Buyer-Package');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(pkgDir)) fs.mkdirSync(pkgDir, { recursive: true });

// Copy root documents
['README.md', 'BUYER_HANDOFF.md', 'FEATURE_MATRIX.md', 'LICENSE.txt'].forEach(file => {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(pkgDir, file));
  }
});

// Copy TECHNICAL_OVERVIEW.md and KNOWN_LIMITATIONS.md
const techOverviewSrc = fs.existsSync(path.join(rootDir, 'docs', 'TECHNICAL_OVERVIEW.md'))
  ? path.join(rootDir, 'docs', 'TECHNICAL_OVERVIEW.md')
  : path.join(rootDir, 'TECHNICAL_OVERVIEW.md');
if (fs.existsSync(techOverviewSrc)) {
  fs.copyFileSync(techOverviewSrc, path.join(pkgDir, 'TECHNICAL_OVERVIEW.md'));
} else {
  fs.copyFileSync(path.join(rootDir, 'BUYER_HANDOFF.md'), path.join(pkgDir, 'TECHNICAL_OVERVIEW.md'));
}

const knownLimSrc = fs.existsSync(path.join(rootDir, 'docs', 'KNOWN_LIMITATIONS.md'))
  ? path.join(rootDir, 'docs', 'KNOWN_LIMITATIONS.md')
  : path.join(rootDir, 'KNOWN_LIMITATIONS.md');
if (fs.existsSync(knownLimSrc)) {
  fs.copyFileSync(knownLimSrc, path.join(pkgDir, 'KNOWN_LIMITATIONS.md'));
} else {
  fs.copyFileSync(path.join(rootDir, 'FEATURE_MATRIX.md'), path.join(pkgDir, 'KNOWN_LIMITATIONS.md'));
}

// Copy directories
copyRecursiveSync(path.join(rootDir, 'docs'), path.join(pkgDir, 'docs'));
copyRecursiveSync(path.join(rootDir, 'buyer-demo'), path.join(pkgDir, 'buyer-demo'));

// Ensure 11-mobile-terminal.png is copied into buyer-demo/screenshots as well
const mobImgSrc = path.join(rootDir, 'buyer-demo', 'mobile', '11-mobile-terminal.png');
if (fs.existsSync(mobImgSrc)) {
  fs.copyFileSync(mobImgSrc, path.join(pkgDir, 'buyer-demo', 'screenshots', '11-mobile-terminal.png'));
}

// Create deployment directory
const deployDir = path.join(pkgDir, 'deployment');
if (!fs.existsSync(deployDir)) fs.mkdirSync(deployDir, { recursive: true });
['Dockerfile', 'docker-compose.yml', 'nginx.conf', 'Procfile', 'railway.json'].forEach(file => {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(deployDir, file));
  }
});

console.log('Quantum-Terminal-Buyer-Package assembled successfully!');
