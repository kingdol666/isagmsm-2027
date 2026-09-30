import type { Locale } from '../core'

/**
 * 公共界面文案（header / footer / 导航 / 账号菜单 / 语言切换）。
 * zh 的值 = 改造前页面上的原字符串（逐字保留，E2E 依赖默认中文渲染）。
 */
export const commonMessages: Record<Locale, Record<string, unknown>> = {
  zh: {
    menu: { open: '菜单', close: '关闭', navLabel: '会议栏目', footerNavLabel: '页脚导航' },
    nav: { registerNow: '立即报名' },
    auth: {
      signIn: '登录',
      signUp: '注册',
      myCredential: '我的会议凭证',
      submitAbstract: '在线投稿',
      myAbstracts: '我的投稿',
      account: '个人中心',
      signOut: '退出登录',
      fallbackName: 'Account',
      scanner: 'Check-in scanner',
      systemStatus: 'System status',
    },
    datesBanner: { label: '重要日期' },
    toggle: { toEn: 'Switch to English', toZh: '切换到中文' },
    map: { loading: '地图加载中…', loadFailed: '地图加载失败' },
  },
  en: {
    menu: { open: 'Menu', close: 'Close', navLabel: 'Symposium sections', footerNavLabel: 'Footer navigation' },
    nav: { registerNow: 'Register Now' },
    auth: {
      signIn: 'Sign in',
      signUp: 'Sign up',
      myCredential: 'My e-Credential',
      submitAbstract: 'Submit Abstract',
      myAbstracts: 'My Abstracts',
      account: 'My Account',
      signOut: 'Sign out',
      fallbackName: 'Account',
      scanner: 'Check-in scanner',
      systemStatus: 'System status',
    },
    datesBanner: { label: 'Important Dates' },
    toggle: { toEn: 'Switch to English', toZh: '切换到中文' },
    map: { loading: 'Loading map…', loadFailed: 'Failed to load the map' },
  },
}
