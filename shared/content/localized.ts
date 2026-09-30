import type { Locale } from '../i18n'
import * as siteZh from './site'
import * as siteEn from './site-en'

/**
 * 按语言取全站内容（CMS-like config 的双语视图）。
 * site.ts = 中文源（原有导出保持不变）；site-en.ts = 英文镜像（结构逐键一致，
 * 由 tests/unit/i18n.test.ts 做结构奇偶校验）。
 */
const sites: Record<Locale, typeof siteZh> = {
  zh: siteZh,
  en: siteEn as unknown as typeof siteZh,
}

export function siteContent(locale: Locale) {
  return sites[locale] ?? siteZh
}
