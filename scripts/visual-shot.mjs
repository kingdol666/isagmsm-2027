// 视觉验收截图：首页（1440/390）、交通页地图、酒店页、注册页
import { chromium } from '@playwright/test'

const base = process.env.SHOT_BASE ?? 'http://localhost:3000'
const outDir = process.env.SHOT_DIR ?? '.tmp/shots'

const targets = [
  { name: 'home-1440', path: '/', width: 1440, height: 900 },
  { name: 'home-390', path: '/', width: 390, height: 844 },
  { name: 'transportation-1440', path: '/transportation', width: 1440, height: 900 },
  { name: 'transportation-390', path: '/transportation', width: 390, height: 844 },
  { name: 'hotels-1440', path: '/hotels', width: 1440, height: 900 },
  { name: 'registration-1440', path: '/registration', width: 1440, height: 900 },
]

const browser = await chromium.launch()
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.width, height: t.height } })
  await page.goto(`${base}${t.path}`, { waitUntil: 'networkidle', timeout: 60000 })
  const hasMap = await page.locator('.maplibregl-canvas').count()
  if (hasMap) {
    // 地图页：滚入视野等瓦片铺满，再按视口截图（整页截图会触发布局重排导致瓦片空白）
    await page.locator('.maplibregl-canvas').first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(9000)
    await page.screenshot({ path: `${outDir}/${t.name}.png`, fullPage: false, animations: 'disabled' })
  }
  else {
    await page.waitForTimeout(3200)
    // animations: 'disabled' — 无限动画定格、入场动画快进到末态，避免滚动拼接截图与运行中动效叠影
    await page.screenshot({ path: `${outDir}/${t.name}.png`, fullPage: true, animations: 'disabled' })
  }
  console.log(`shot ${t.name}`)
  await page.close()
}
await browser.close()
