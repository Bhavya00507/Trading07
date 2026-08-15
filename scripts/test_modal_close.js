// d:\Trading07\scripts\test_modal_close.js
const { chromium } = require('playwright-core');

(async () => {
  console.log('Testing closing Indicator Library Modal via .tv-close-btn...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Login via API/UI
  const user = 'demouser' + Math.floor(Math.random() * 10000);
  await fetch('http://127.0.0.1:8000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, email: `${user}@quantum.com`, password: 'Password123!' })
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.$eval('input[placeholder*="username"]', (el, u) => el.value = u, user);
  await page.$eval('input[placeholder*="password"]', (el) => el.value = 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Open Indicator Library Modal
  console.log('Opening Indicator Library Modal...');
  await page.evaluate(() => window.dispatchEvent(new Event('open-indicator-library')));
  await page.waitForTimeout(1000);

  let hasModal = await page.$('.tv-indicator-library-dialog');
  console.log('  Indicator Modal open:', !!hasModal);

  // Close Indicator Library Modal
  console.log('Closing Indicator Library Modal via .tv-close-btn...');
  await page.click('.tv-close-btn');
  await page.waitForTimeout(1000);

  hasModal = await page.$('.tv-indicator-library-dialog');
  console.log('  Indicator Modal open after close click:', !!hasModal);

  if (!hasModal) {
    console.log('SUCCESS! Modal closed cleanly!');
  } else {
    console.log('FAILED! Modal still present.');
  }

  await browser.close();
})();
