import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' })

await page.click('.type-row:has-text("Academic")')
await page.waitForTimeout(400)

const state = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Continue'))
  const rows = [...document.querySelectorAll('.type-row')]
  return {
    btnDisabled: btn?.hasAttribute('disabled'),
    btnRect: btn?.getBoundingClientRect().toJSON(),
    selectedCount: rows.filter(r => r.classList.contains('selected')).length,
    rowClasses: rows.map(r => r.className),
  }
})
console.log(JSON.stringify(state, null, 2))

// sample bounding boxes over time to detect instability
const boxes = []
for (let i = 0; i < 5; i++) {
  boxes.push(await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Continue'))
    const r = btn?.getBoundingClientRect()
    return r ? `${Math.round(r.x)},${Math.round(r.y)}` : 'none'
  }))
  await page.waitForTimeout(300)
}
console.log('button positions over 1.5s:', boxes.join(' | '))
await browser.close()
