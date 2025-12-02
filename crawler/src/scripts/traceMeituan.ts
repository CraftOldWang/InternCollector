import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api') || url.includes('/list') || url.includes('job')) {
      console.log('REQ', req.method(), url);
    }
  });

  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/api') || url.includes('/list') || url.includes('job')) {
      console.log('RESP', resp.status(), url);
    }
  });

  await page.goto('https://job.meituan.com/web/job/list', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  await browser.close();
})();
