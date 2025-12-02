import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://job.meituan.com/web/job/list', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  const itemsCount = await page.evaluate(() => document.querySelectorAll('.position-item, .job-item').length);
  console.log('count:', itemsCount);
  const items = await page.$$eval('.position-item, .job-item', nodes => Array.from(nodes).slice(0,10).map(n => ({text: n.textContent?.trim().slice(0,120)})));
  console.log(items);
  await browser.close();
})();
