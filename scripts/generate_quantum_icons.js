// d:\Trading07\scripts\generate_quantum_icons.js
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '..', 'public');

async function createIcon(size) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: size, height: size } });

  const fontSize = Math.round(size * 0.42);
  const subFontSize = Math.round(size * 0.08);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          width: ${size}px;
          height: ${size}px;
          background: radial-gradient(circle at 30% 30%, #151d2a 0%, #070a10 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          border-radius: ${Math.round(size * 0.18)}px;
          border: ${Math.round(size * 0.02)}px solid rgba(56, 189, 248, 0.3);
          box-shadow: inset 0 0 ${Math.round(size * 0.1)}px rgba(56, 189, 248, 0.2);
        }
        .logo-box {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .q-text {
          font-size: ${fontSize}px;
          font-weight: 900;
          background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -2px;
          line-height: 1;
        }
        .t-text {
          font-size: ${fontSize}px;
          font-weight: 900;
          color: #f59e0b;
          letter-spacing: -2px;
          line-height: 1;
        }
        .sub-text {
          margin-top: ${Math.round(size * 0.04)}px;
          font-size: ${subFontSize}px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: ${Math.round(size * 0.02)}px;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="logo-box">
        <span class="q-text">Q</span><span class="t-text">T</span>
      </div>
      <div class="sub-text">Quantum</div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(300);
  const buffer = await page.screenshot({ omitBackground: false });
  await browser.close();
  return buffer;
}

(async () => {
  console.log('Generating official Quantum Terminal PWA Icons...');

  const icon192 = await createIcon(192);
  fs.writeFileSync(path.join(publicDir, 'icon-192x192.png'), icon192);
  console.log(`[SAVED] public/icon-192x192.png (${icon192.length} bytes)`);

  const icon512 = await createIcon(512);
  fs.writeFileSync(path.join(publicDir, 'icon-512x512.png'), icon512);
  console.log(`[SAVED] public/icon-512x512.png (${icon512.length} bytes)`);
})();
