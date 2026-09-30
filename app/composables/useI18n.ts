import { messages, resolveMessage, resolveList, DEFAULT_LOCALE, LOCALE_COOKIE } from '#shared/i18n'
import type { Locale } from '#shared/i18n'

/**
 * 站点 i18n：locale 存 cookie（pps_locale），SSR 与客户端同源读取 → 无水合闪烁；
 * setLocale 即时切换（响应式），下次加载由服务端按 cookie 直接渲染目标语言。
 */
export function useI18n() {
  const cookie = useCookie<string | undefined>(LOCALE_COOKIE, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const locale = useState<Locale>('pps-locale', () => (cookie.value === 'en' ? 'en' : DEFAULT_LOCALE))

  function setLocale(next: Locale) {
    locale.value = next
    cookie.value = next
  }

  function toggleLocale() {
    setLocale(locale.value === 'en' ? DEFAULT_LOCALE : 'en')
  }

  /** 取文案：点路径 + {name} 插值；缺失键返回路径本身（便于联调发现漏键）。 */
  function t(path: string, params?: Record<string, string | number>): string {
    return resolveMessage(messages[locale.value], path, params)
  }

  /** 取字符串数组文案（如步骤列表）；缺失返回空数组。 */
  function ta(path: string): string[] {
    return resolveList(messages[locale.value], path)
  }

  const isEn = computed(() => locale.value === 'en')

  return { locale, isEn, setLocale, toggleLocale, t, ta }
}
