// d:\Trading07\scripts\test_close_script_editor.js
const { chromium } = require('playwright-core');

(async () => {
  console.log('Testing closing Script Studio Modal...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Login via UI
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

  // Open Script Studio Modal
  console.log('Opening Script Studio Modal...');
  await page.click('button[title*="Script Studio"]');
  await page.waitForTimeout(1000);

  let modal = await page.$('text=QUANTUM SCRIPT STUDIO');
  console.log('  Script Studio open:', !!modal);

  // Close Script Studio Modal
  console.log('Closing Script Studio Modal via page.keyboard.press("Escape")...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  modal = await page.$('text=QUANTUM SCRIPT STUDIO');
  console.log('  Script Studio open after Escape:', !!modal);

  if (!modal) {
    console.log('SUCCESS! Script Studio modal closed cleanly via Escape!');
  } else {
    console.log('Trying button click...');
    const closeBtn = await page.$('div:has-text("QUANTUM SCRIPT STUDIO") button');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(1000);
    modal = await page.$('text=QUANTUM SCRIPT STUDIO');
    console.log('  Script Studio open after button click:', !!modal);
  }

  await browser.close();
})();
