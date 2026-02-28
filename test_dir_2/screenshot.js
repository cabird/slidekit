const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  await page.goto('http://localhost:8765/test_dir_2/source/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // let fonts + animations settle

  // Get total slide count
  const slideCount = await page.evaluate(() => {
    return Reveal.getTotalSlides();
  });
  console.log(`Total slides: ${slideCount}`);

  for (let i = 0; i < slideCount; i++) {
    await page.evaluate((idx) => Reveal.slide(idx), i);
    await page.waitForTimeout(500);
    const num = String(i + 1).padStart(2, '0');
    await page.screenshot({ path: `test_dir_2/reference/slide-${num}.png` });
    console.log(`Saved reference/slide-${num}.png`);
  }

  await browser.close();
  console.log('Done!');
})();
