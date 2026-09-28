// Usage: node check.js <absolute-path-to-html>
// Checks: console/page errors + horizontal overflow at 375/390/414px
const { chromium } = require('playwright');

(async () => {
  const file = process.argv[2];
  if (!file) { console.error('usage: node check.js <html>'); process.exit(1); }
  const url = 'file:///' + file.replace(/\\/g, '/').replace(/^\/+/, '');
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', e => errors.push('[pageerror] ' + String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  for (const w of [375, 390, 414]) {
    await page.setViewportSize({ width: w, height: 812 });
    await page.waitForTimeout(300);
    const res = await page.evaluate(() => {
      const dw = document.documentElement;
      const overflow = dw.scrollWidth - dw.clientWidth;
      const offenders = [];
      if (overflow > 1) {
        document.querySelectorAll('body *').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.right > dw.clientWidth + 1 && r.width > 8) {
            offenders.push(el.tagName + '.' + String(el.className).slice(0, 50) + ' right=' + Math.round(r.right));
          }
        });
      }
      return { overflow, offenders: offenders.slice(0, 6) };
    });
    console.log(`width ${w}: overflow=${res.overflow}px` + (res.offenders.length ? '\n  offenders: ' + res.offenders.join(' | ') : ''));
  }
  console.log('console/page errors: ' + (errors.length ? '\n' + errors.join('\n') : 'none'));
  await browser.close();
})();
