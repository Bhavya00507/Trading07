// d:\Trading07\scripts\update_and_rebuild_overview.js
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const screenshotsDir = path.join(rootDir, 'buyer-demo', 'screenshots');
const mobileDir = path.join(rootDir, 'buyer-demo', 'mobile');
const presentationDir = path.join(rootDir, 'buyer-demo', 'presentation');

const userUploadedDir = `C:\\Users\\bhavy\\.gemini\\antigravity-ide\\brain\\4671aca4-015a-4c35-962d-921f037f002c\\.user_uploaded`;

const userHealthImage = path.join(userUploadedDir, 'media_1786772388426.png');
const userMobileImage = path.join(userUploadedDir, 'media_1786772565180.jpg');

const targetHealthPath = path.join(screenshotsDir, '12-system-health.png');
const targetMobilePath = path.join(mobileDir, '11-mobile-terminal.png');

console.log('===========================================================');
console.log('  REPLACING 11-MOBILE-TERMINAL AND 12-SYSTEM-HEALTH ASSETS');
console.log('===========================================================');

// 1. Copy System Health Image
if (fs.existsSync(userHealthImage)) {
  fs.copyFileSync(userHealthImage, targetHealthPath);
  console.log(`[UPDATED] 12-system-health.png replaced from user attachment (${fs.statSync(targetHealthPath).size} bytes)`);
} else {
  console.error(`[ERROR] userHealthImage not found at ${userHealthImage}`);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 2. Convert & Save Mobile Image to PNG format
  if (fs.existsSync(userMobileImage)) {
    const page = await browser.newPage();
    const jpgB64 = fs.readFileSync(userMobileImage).toString('base64');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><style>body { margin: 0; padding: 0; background: #000; }</style></head>
      <body><img src="data:image/jpeg;base64,${jpgB64}" style="display:block; width:100%;" /></body>
      </html>
    `);
    const imgBounds = await page.$eval('img', el => ({ width: el.naturalWidth || el.clientWidth, height: el.naturalHeight || el.clientHeight }));
    await page.setViewportSize({ width: imgBounds.width || 390, height: imgBounds.height || 844 });
    const pngBuffer = await page.screenshot();
    fs.writeFileSync(targetMobilePath, pngBuffer);
    console.log(`[UPDATED] 11-mobile-terminal.png converted & saved as PNG (${pngBuffer.length} bytes)`);
  } else {
    console.error(`[ERROR] userMobileImage not found at ${userMobileImage}`);
  }

  // 3. Re-generate Overview Contact Sheet (quantum-terminal-screenshot-overview.png)
  console.log('\n[CONTACT SHEET] Rebuilding 4x3 Grid Contact Sheet with updated assets...');
  const contactPage = await browser.newPage({ viewport: { width: 1920, height: 1440 } });
  const getB64 = (p) => fs.readFileSync(p).toString('base64');

  const img01 = getB64(path.join(screenshotsDir, '01-dashboard.png'));
  const img02 = getB64(path.join(screenshotsDir, '02-markets.png'));
  const img03 = getB64(path.join(screenshotsDir, '03-charting.png'));
  const img04 = getB64(path.join(screenshotsDir, '04-paper-trading.png'));
  const img05 = getB64(path.join(screenshotsDir, '05-risk-portfolio.png'));
  const img06 = getB64(path.join(screenshotsDir, '06-replay-studio.png'));
  const img07 = getB64(path.join(screenshotsDir, '07-options-desk.png'));
  const img08 = getB64(path.join(screenshotsDir, '08-script-studio.png'));
  const img09 = getB64(path.join(screenshotsDir, '09-market-data.png'));
  const img10 = getB64(path.join(screenshotsDir, '10-smart-order-router.png'));
  const img11 = getB64(path.join(mobileDir, '11-mobile-terminal.png'));
  const img12 = getB64(path.join(screenshotsDir, '12-system-health.png'));

  const contactHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 24px; background: #070b14; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px; }
        .header h1 { margin: 0; font-size: 26px; color: #38bdf8; letter-spacing: 1px; }
        .header p { margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .card { background: #0c101b; border: 1px solid #1b2235; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
        .card img { width: 100%; height: 215px; object-fit: cover; display: block; border-bottom: 1px solid #1b2235; }
        .card-body { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; }
        .card-title { font-size: 12px; font-weight: 700; color: #e2e8f0; }
        .card-num { font-size: 10px; font-weight: 800; color: #38bdf8; background: rgba(56,189,248,0.12); padding: 2px 6px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>QUANTUM TERMINAL — VERIFIED BUYER PRESENTATION ASSETS</h1>
        <p>12 Genuinely Unique Application Screens Captured from Authenticated Workstation (Zero Login Screens)</p>
      </div>
      <div class="grid">
        <div class="card"><img src="data:image/png;base64,${img01}" /><div class="card-body"><span class="card-title">01 Dashboard</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img02}" /><div class="card-body"><span class="card-title">02 Markets</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img03}" /><div class="card-body"><span class="card-title">03 Charting</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img04}" /><div class="card-body"><span class="card-title">04 Paper Trading</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img05}" /><div class="card-body"><span class="card-title">05 Portfolio & Risk</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img06}" /><div class="card-body"><span class="card-title">06 Replay Studio</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img07}" /><div class="card-body"><span class="card-title">07 Options Desk</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img08}" /><div class="card-body"><span class="card-title">08 Script Studio</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img09}" /><div class="card-body"><span class="card-title">09 Market Data</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img10}" /><div class="card-body"><span class="card-title">10 Smart Router</span><span class="card-num">1920x1080</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img11}" /><div class="card-body"><span class="card-title">11 Mobile Pro</span><span class="card-num">390x844</span></div></div>
        <div class="card"><img src="data:image/png;base64,${img12}" /><div class="card-body"><span class="card-title">12 System Health</span><span class="card-num">1920x1080</span></div></div>
      </div>
    </body>
    </html>
  `;

  await contactPage.setContent(contactHtml);
  await contactPage.waitForTimeout(1000);

  const contactPath = path.join(presentationDir, 'quantum-terminal-screenshot-overview.png');
  await contactPage.screenshot({ path: contactPath, fullPage: true });
  console.log(`[SAVED] Overview contact sheet saved to ${contactPath}`);

  await browser.close();
})();
