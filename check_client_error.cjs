const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:4001/test', { waitUntil: 'networkidle0' });
  const content = await page.content();
  console.log(content.substring(0, 1500));
  
  await browser.close();
})();
