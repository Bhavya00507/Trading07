// d:\Trading07\scripts\capture_all_screenshots.js
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const screenshotsDir = path.join(rootDir, 'buyer-demo', 'screenshots');
const mobileDir = path.join(rootDir, 'buyer-demo', 'mobile');
const presentationDir = path.join(rootDir, 'buyer-demo', 'presentation');

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
if (!fs.existsSync(mobileDir)) fs.mkdirSync(mobileDir, { recursive: true });
if (!fs.existsSync(presentationDir)) fs.mkdirSync(presentationDir, { recursive: true });

(async () => {
  console.log('=== REAL BUYER DEMO SCREENSHOT CAPTURE PROCESS ===');

  // 1. Authenticate with backend to get valid JWT token
  const user = 'demotrader' + Math.floor(Math.random() * 100000);
  const regRes = await fetch('http://127.0.0.1:8000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, email: `${user}@quantum.com`, password: 'Password123!' })
  });
  console.log('Registration Status:', regRes.status);

  const loginRes = await fetch('http://127.0.0.1:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: 'Password123!' })
  });
  const authData = await loginRes.json();
  console.log('Login Status:', loginRes.status, 'Token acquired:', !!authData.access_token);

  if (!authData.access_token) {
    throw new Error('Failed to acquire valid access_token from FastAPI backend!');
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // --- DESKTOP SCREENSHOTS (1920x1080) ---
  console.log('\n[1/3] Capturing Desktop Screenshots (1920x1080)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  const page = await desktopContext.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

  // Store auth state in localStorage
  await page.evaluate((auth) => {
    localStorage.setItem(
      'trading-app-store',
      JSON.stringify({
        state: {
          token: auth.access_token,
          refreshToken: auth.refresh_token,
          user: auth.user,
          activeAccountType: 'paper',
          settings: { mode: 'pro', darkTheme: true, chartTradingEnabled: true }
        },
        version: 0,
      })
    );
    localStorage.setItem('quantum_token', auth.access_token);
    localStorage.setItem('access_token', auth.access_token);
  }, authData);

  // Reload page to open authenticated main workstation
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Verify Auth is bypassed and Main App is active
  const isMainAppReady = await page.$('.app-header');
  if (!isMainAppReady) {
    throw new Error('Main application failed to render authenticated state!');
  }

  // Screenshot 01: Dashboard (Open Buyer Presentation Dashboard Modal)
  console.log('Capturing 01-dashboard.png (Buyer Presentation Dashboard)...');
  await page.evaluate(() => {
    const badge = document.querySelector('.buyer-demo-badge');
    if (badge) badge.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '01-dashboard.png') });

  // Close modal to reveal workspace
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.buyer-demo-modal-close');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(500);

  // Screenshot 02: Markets (Main Workstation with Watchlist)
  console.log('Capturing 02-markets.png (Multi-Asset Watchlist Workstation)...');
  await page.screenshot({ path: path.join(screenshotsDir, '02-markets.png') });

  // Screenshot 03: Charting (Multi-Chart Workstation & Indicators)
  console.log('Capturing 03-charting.png (Multi-Chart Canvas & Indicators)...');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('open-indicator-library'));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '03-charting.png') });

  // Close indicator modal if open
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(500);

  // Screenshot 04: Paper Trading (Order Panel & Canvas SL/TP Lines)
  console.log('Capturing 04-paper-trading.png (Paper Order Execution Panel)...');
  await page.evaluate(() => {
    const orderBtn = document.querySelector('button[title*="Order Panel"]');
    if (orderBtn) orderBtn.click();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '04-paper-trading.png') });

  // Screenshot 05: Risk / Portfolio (Bottom Workspace - Positions & Risk Desk)
  console.log('Capturing 05-risk-portfolio.png (Portfolio Analytics & Risk Desk)...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'positions' }));
    window.dispatchEvent(new Event('expand-bottom-panel'));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '05-risk-portfolio.png') });

  // Screenshot 06: Replay Studio
  console.log('Capturing 06-replay-studio.png (Market Replay Studio)...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'replay' }));
    window.dispatchEvent(new Event('expand-bottom-panel'));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '06-replay-studio.png') });

  // Screenshot 07: Options Desk
  console.log('Capturing 07-options-desk.png (Institutional Options Desk)...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'options' }));
    window.dispatchEvent(new Event('expand-bottom-panel'));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '07-options-desk.png') });

  // Screenshot 08: Script Studio
  console.log('Capturing 08-script-studio.png (Script Studio Engine)...');
  await page.evaluate(() => {
    const scriptBtn = document.querySelector('button[title*="Script Studio"]');
    if (scriptBtn) scriptBtn.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '08-script-studio.png') });

  // Close script editor window
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.script-editor-close');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(500);

  // Screenshot 09: Market Data Gateway
  console.log('Capturing 09-market-data.png (Market Data Gateway Stream)...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'marketdata' }));
    window.dispatchEvent(new Event('expand-bottom-panel'));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '09-market-data.png') });

  // Screenshot 10: Smart Order Router
  console.log('Capturing 10-smart-order-router.png (Smart Order Router Simulation)...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'sor' }));
    window.dispatchEvent(new Event('expand-bottom-panel'));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '10-smart-order-router.png') });

  // Screenshot 12: System Health Modal
  console.log('Capturing 12-system-health.png (Technical System Health Modal)...');
  await page.evaluate(() => {
    const healthBtn = document.querySelector('button[title*="System Technical Health"]');
    if (healthBtn) healthBtn.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '12-system-health.png') });

  await desktopContext.close();

  // --- MOBILE SCREENSHOT (390x844) ---
  console.log('\n[2/3] Capturing Quantum Mobile Pro Screenshot (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

  // Store auth state in mobile context
  await mobilePage.evaluate((auth) => {
    localStorage.setItem(
      'trading-app-store',
      JSON.stringify({
        state: {
          token: auth.access_token,
          refreshToken: auth.refresh_token,
          user: auth.user,
          activeAccountType: 'paper',
        },
        version: 0,
      })
    );
    localStorage.setItem('quantum_token', auth.access_token);
    localStorage.setItem('access_token', auth.access_token);
  }, authData);

  await mobilePage.reload({ waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);

  // Close modal if open on mobile
  await mobilePage.evaluate(() => {
    const closeBtn = document.querySelector('.buyer-demo-modal-close');
    if (closeBtn) closeBtn.click();
  });
  await mobilePage.waitForTimeout(500);

  // Toggle mobile view if needed
  await mobilePage.evaluate(() => {
    window.dispatchEvent(new Event('toggle-mobile-view'));
  });
  await mobilePage.waitForTimeout(1500);

  // Screenshot 11: Mobile Terminal
  console.log('Capturing 11-mobile-terminal.png (Quantum Mobile Pro)...');
  await mobilePage.screenshot({ path: path.join(mobileDir, '11-mobile-terminal.png') });

  await mobileContext.close();

  // --- STITCH CONTACT SHEET (quantum-terminal-screenshot-overview.png) ---
  console.log('\n[3/3] Generating Contact Sheet Overview...');
  const contactPage = await browser.newPage({ viewport: { width: 1920, height: 1440 } });

  // Convert images to base64 for embedding in contact sheet HTML
  const getB64 = (filePath) => fs.readFileSync(filePath).toString('base64');
  
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
        body { margin: 0; padding: 20px; background: #070b14; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }
        .header h1 { margin: 0; font-size: 24px; color: #38bdf8; letter-spacing: 1px; }
        .header p { margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .card { background: #0c101b; border: 1px solid #1b2235; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
        .card img { width: 100%; height: 210px; object-fit: cover; display: block; border-bottom: 1px solid #1b2235; }
        .card-body { padding: 10px; display: flex; justify-content: space-between; align-items: center; }
        .card-title { font-size: 12px; font-weight: 700; color: #e2e8f0; }
        .card-num { font-size: 10px; font-weight: 800; color: #38bdf8; background: rgba(56,189,248,0.12); padding: 2px 6px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>QUANTUM TERMINAL — BUYER PRESENTATION ASSET OVERVIEW</h1>
        <p>Real Captured Screenshots across 12 Modules (Desktop 1920x1080 / Mobile 390x844)</p>
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
  console.log(`Contact sheet saved to ${contactPath}`);

  await browser.close();
  console.log('\n=== ALL 12 REAL SCREENSHOTS AND CONTACT SHEET GENERATED! ===');
})();
