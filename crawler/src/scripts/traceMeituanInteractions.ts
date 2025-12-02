import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', req => console.log('REQ', req.method(), req.url()));
  page.on('response', resp => console.log('RESP', resp.status(), resp.url()));

  await page.goto('https://job.meituan.com/web/job/list', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click any filter or category that contains '实习'
  try {
    const intern = await page.locator('text=实习').first();
    if (await intern.count() > 0) {
      await intern.click();
      console.log('Clicked 实习 filter');
    }
  } catch (e) {
    console.log('No 实习 text filter found');
  }

  // Try clicking first category that might trigger list
  try {
    const category = await page.locator('.category-container, .filter, .select, .job-filter').first();
    if (await category.count() > 0) {
      await category.click();
      console.log('Clicked category');
    }
  } catch (e) {
    console.log('No category found');
  }

  await page.waitForTimeout(6000);
  await browser.close();
})();
