import type { Locale } from '../core'

/**
 * 首页（/）各区块的组件级文案：Hero / 重要日期 / 大会报告 / 参展赞助 + SEO。
 * 内容主体（简介段落、日期表、日程、票种、讲者、赞助档位等数据）来自
 * shared/content/site.ts 与 site-en.ts，组件经 siteContent(locale) 取用；
 * 这里只放组件里硬编码的 chrome 文案（区块标签、按钮、提示语、SEO 模板）。
 * zh 的值 = 改造前组件上的原字符串（逐字保留，E2E 依赖默认中文渲染）。
 * 日程表头 Time/Session/Speaker/Room 与票种状态 Available/On invitation
 * 为设计上保留的英文仪器标签，暂未进字典。
 */
export const homeMessages: Record<Locale, Record<string, unknown>> = {
  zh: {
    seo: {
      title: '{name} · {dates} · {location}',
      description: '{nameEn}（{nameZh}），{dates}，{location}。围绕凝胶材料设计合成、软物质物理、智能响应体系、生物医用转化与产业化交流最新进展。',
      ogTitle: 'ISAGMSM 2027 — {name}',
      ogDescription: '{dates} · {location} · 立即报名',
    },
    hero: {
      ariaLabel: 'ISAGMSM 2027 — 第五届先进凝胶材料与软物质国际学术研讨会',
      kickerCode: 'ISAGMSM—00',
      kickerRest: ' · 第五届 · 国际学术研讨会',
      titleA: '先进凝胶材料',
      titleB: '与软物质',
      sub: '国际学术研讨会 · 2027',
      metaDates: '会议时间 / DATES',
      metaVenue: '参会地址 / VENUE',
      ctaRegister: '立即报名',
      ctaAbstract: '征文投稿',
      figAria: '凝胶网络与流动示意图形（动态仪器）',
      figCaption: 'FIG. 00 — 凝胶网络与软物质流动（动态示意）',
    },
    dates: {
      cfpTag: '征稿启事',
      cfpText: ' — 欢迎围绕六大研究方向投稿，摘要提交截止 2027年3月25日。',
      cfpCta: '提交摘要',
    },
    speakers: {
      title: '拟邀大会报告',
      headBadge: '大会报告',
    },
    sponsors: {
      cta: '赞助详情与洽谈',
    },
  },
  en: {
    seo: {
      title: '{name} · {dates} · {location}',
      description: '{nameEn} ({nameZh}), {dates}, {location}. Exchanging the latest advances in gel materials design and synthesis, soft matter physics, stimuli-responsive systems, biomedical translation and industrialization.',
      ogTitle: 'ISAGMSM 2027 — {name}',
      ogDescription: '{dates} · {location} · Register Now',
    },
    hero: {
      ariaLabel: 'ISAGMSM 2027 — The 5th International Symposium for Advanced Gel Materials & Soft Matters',
      kickerCode: 'ISAGMSM—00',
      kickerRest: ' · 5th Edition · International Symposium',
      titleA: 'Advanced Gel Materials',
      titleB: '& Soft Matters',
      sub: 'International Symposium · 2027',
      metaDates: 'DATES',
      metaVenue: 'VENUE',
      ctaRegister: 'Register Now',
      ctaAbstract: 'Submit Abstract',
      figAria: 'Gel network and flow diagram (kinetic instrument)',
      figCaption: 'FIG. 00 — Gel network and soft matter flow (dynamic diagram)',
    },
    dates: {
      cfpTag: 'Call for Abstracts',
      cfpText: ' — Abstracts are welcome across the six research directions; the submission deadline is March 25, 2027.',
      cfpCta: 'Submit Abstract',
    },
    speakers: {
      title: 'Keynote Lectures (to be invited)',
      headBadge: 'Keynote Lecture',
    },
    sponsors: {
      cta: 'Sponsorship Details & Enquiries',
    },
  },
}
