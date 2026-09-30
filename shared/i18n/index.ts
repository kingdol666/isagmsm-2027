import type { Locale } from './core'
import { commonMessages } from './slices/common'
import { authMessages } from './slices/auth'
import { contentMessages } from './slices/content'
import { accountMessages } from './slices/account'
import { registerMessages } from './slices/register'
import { paymentMessages } from './slices/payment'
import { submitMessages } from './slices/submit'
import { scanMessages } from './slices/scan'
import { credentialMessages } from './slices/credential'
import { homeMessages } from './slices/home'
import { errorMessages } from './slices/error'

/**
 * 全部 UI 文案（按功能切片合并；zh/en 逐键同构，tests/unit/i18n.test.ts 奇偶校验）。
 * 切片：common 公共框架 · auth 认证 · content 内容页 chrome · account 个人中心 ·
 * register 报名/注册信息 · payment 支付/模拟支付 · submit 投稿/征文 · scan 扫码核验 ·
 * credential 电子凭证/核验 · home 首页区块。
 */
/**
 * 切片归一化：切片内部可以带与切片同名的根键包装（如 scan.ts 的 zh: { scan: {...} }），
 * 也可以直接展开（如 auth.ts 的 zh: { login: {...} }）。合并时统一去掉同名包装，
 * 保证 t() 的路径永远是 `切片名.键`。zh/en 两个树都要归一化。
 */
function normalizeSlice(pair: Record<Locale, Record<string, unknown>>, name: string): Record<Locale, Record<string, unknown>> {
  const keys = Object.keys(pair.zh)
  const root = keys[0]
  const wrapped = keys.length === 1 && root !== undefined && root === name && pair.en[root] != null
  if (!wrapped) return pair
  return {
    zh: pair.zh[root!] as Record<string, unknown>,
    en: pair.en[root!] as Record<string, unknown>,
  }
}

const slices = {
  common: commonMessages,
  auth: authMessages,
  content: contentMessages,
  account: accountMessages,
  register: registerMessages,
  payment: paymentMessages,
  submit: submitMessages,
  scan: scanMessages,
  credential: credentialMessages,
  home: homeMessages,
  error: errorMessages,
}

export const messages: Record<Locale, Record<string, unknown>> = {
  zh: Object.fromEntries(Object.entries(slices).map(([name, pair]) => [name, normalizeSlice(pair, name).zh])),
  en: Object.fromEntries(Object.entries(slices).map(([name, pair]) => [name, normalizeSlice(pair, name).en])),
}

export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, resolveMessage, resolveList, messagePaths } from './core'
export type { Locale } from './core'
