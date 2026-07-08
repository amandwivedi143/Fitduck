import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:5174';
const OUT = path.resolve(__dirname, '../../../docs/assets/screenshots');

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();

console.log('Capturing login page...');
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, 'login.png') });

console.log('Capturing signup tab...');
await page.getByRole('tab', { name: 'Sign up' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT, 'login-signup.png') });

await page.getByRole('tab', { name: 'Login' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(OUT, 'hero-banner.png') });

await context.close();
await browser.close();
console.log(`Saved to ${OUT}`);
