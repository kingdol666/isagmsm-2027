import type { Locale } from '../core'

/** 全局错误页（app/error.vue）文案。 */
export const errorMessages: Record<Locale, Record<string, unknown>> = {
  zh: {
    error: {
      '404A': '此页',
      '404Em': '为空',
      errA: '流程',
      errEm: '中断',
      body404: '你访问的页面不在 ISAGMSM 2027 的站点目录中。',
      bodyErr: '发生了意外错误，请稍后重试；如持续出现请联系会务组。',
      back: '返回会议官网',
      contact: '联系会务组',
    },
  },
  en: {
    error: {
      '404A': 'This page is',
      '404Em': ' empty',
      errA: 'Process',
      errEm: ' interrupted',
      body404: 'The page you requested does not exist on the ISAGMSM 2027 site.',
      bodyErr: 'An unexpected error occurred. Please try again later, or contact the secretariat if it persists.',
      back: 'Back to the symposium',
      contact: 'Contact secretariat',
    },
  },
}
