// d:\Trading07\scripts\test_ui_login.js
const { chromium } = require('playwright-core');

(async () => {
  console.log('Testing UI Form Login via Playwright...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // 1. First register user via API so credentials exist
  const user = 'demouser' + Math.floor(Math.random() * 10000);
  const password = 'Password123!';
  const regRes = await fetch('http://127.0.0.1:8000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, email: `${user}@quantum.com`, password })
  });
  console.log('Registered user:', user, 'Status:', regRes.status);

  // 2. Open http://localhost:5173
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 3. Fill Username and Password in UI form
  console.log('Filling UI login form...');
  const usernameInput = await page.$('input[placeholder*="username"]');
  const passwordInput = await page.$('input[placeholder*="password"]');
  const submitBtn = await page.$('button[type="submit"]');

  if (usernameInput && passwordInput && submitBtn) {
    await usernameInput.fill(user);
    await passwordInput.fill(password);
    await submitBtn.click();
    console.log('Clicked Sign In. Waiting for main application to mount...');
    await page.waitForTimeout(3000);
  } else {
    console.log('Could not find login inputs!');
  }

  // 4. Verify main application UI elements
  const hasLogo = await page.$('.logo');
  const hasHeader = await page.$('.app-header');
  const hasAuth = await page.$('.auth-wrapper');
  const hasChart = await page.$('.chart-container') || await page.$('canvas');

  console.log('\nUI LOGIN VERIFICATION RESULTS:');
  console.log('  Main Logo (.logo):', !!hasLogo);
  console.log('  App Header (.app-header):', !!hasHeader);
  console.log('  Chart/Canvas:', !!hasChart);
  console.log('  Auth Form (.auth-wrapper):', !!hasAuth);

  if (hasLogo && hasHeader && !hasAuth) {
    console.log('\nSUCCESS! Authenticated into main Quantum Terminal Workstation!');
  } else {
    console.log('\nFAILED: Still on Auth page.');
  }

  await browser.close();
})();
