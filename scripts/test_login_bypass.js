// d:\Trading07\scripts\test_login_bypass.js
const { chromium } = require('playwright-core');

(async () => {
  console.log('Testing App Launch with Valid Backend Token...');

  // 1. Get valid access token from FastAPI backend
  const user = 'demotrader' + Math.floor(Math.random() * 100000);
  const regRes = await fetch('http://127.0.0.1:8000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, email: `${user}@quantum.com`, password: 'Password123!' })
  });
  console.log('Reg status:', regRes.status);

  const loginRes = await fetch('http://127.0.0.1:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: 'Password123!' })
  });
  const authData = await loginRes.json();
  console.log('Login status:', loginRes.status, 'Token acquired:', !!authData.access_token);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Navigate to app origin
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

  // Store valid token in localStorage keys
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

  // Reload page to enter main trading workstation
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Check UI elements
  const hasLogo = await page.$('.logo');
  const hasHeader = await page.$('.app-header');
  const hasAuth = await page.$('.auth-wrapper');
  
  console.log('App State Check:');
  console.log('  Logo visible (Main App):', !!hasLogo);
  console.log('  Header visible:', !!hasHeader);
  console.log('  Auth Form visible:', !!hasAuth);

  await browser.close();
})();
