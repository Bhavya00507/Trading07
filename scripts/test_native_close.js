// d:\Trading07\scripts\test_native_close.js
const { chromium } = require('playwright-core');

(async () => {
  console.log('Testing native Playwright click and Ctrl+I toggle...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Register & Login via UI
  const user = 'demouser' + Math.floor(Math.random() * 10000);
  await fetch('http://127.0.0.1:8000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, email: `${user}@quantum.com`, password: 'Password123!' })
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder*="username"]', user);
  await page.fill('input[placeholder*="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 1. Open Indicator Library via Ctrl+I
  console.log('Opening Indicator Library via Ctrl+I...');
  await page.keyboard.press('Control+i');
  await page.waitForTimeout(1000);

  let modal = await page.$('.tv-indicator-library-dialog');
  console.log('  Indicator Modal visible:', !!modal);

  // 2. Close Indicator Library via native page.click('.tv-close-btn')
  console.log('Closing Indicator Library via native page.click(".tv-close-btn")...');
  if (modal) {
    await page.click('.tv-close-btn');
    await page.waitForTimeout(1000);
  }

  modal = await page.$('.tv-indicator-library-dialog');
  console.log('  Indicator Modal visible after native click:', !!modal);

  // 3. Toggle via Ctrl+I again
  if (modal) {
    console.log('Toggling via Ctrl+I...');
    await page.keyboard.press('Control+i');
    await page.waitForTimeout(1000);
    modal = await page.$('.tv-indicator-library-dialog');
    console.log('  Indicator Modal visible after Ctrl+I toggle:', !!modal);
  }

  await browser.close();
})();
