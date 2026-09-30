import type { Locale } from '../core'

/**
 * 内容页（组织机构/交通/酒店/赞助）页面级文案。
 * 内容主体（段落/列表/表格数据）来自 shared/content/site.ts 与 site-en.ts；
 * 这里只放页面 chrome（标题标签/操作提示/表头）。
 * zh 的值 = 改造前页面上的原字符串（逐字保留，E2E 依赖默认中文渲染）。
 */
export const contentMessages: Record<Locale, Record<string, unknown>> = {
  zh: {
    content: {
      org: {
        seoTitle: '组织机构',
        note: '名单以会议第二轮通知为准。如需更新单位或委员信息，请联系会务组。',
      },
      transport: {
        seoTitle: '会场交通',
        listHint: '点击任意地点，右侧地图将切换到对应位置',
        viewing: '正在查看：{name}',
        showingAll: '当前显示全部交通节点 · 点击左侧列表聚焦单个地点',
      },
      hotels: {
        seoTitle: '酒店预定',
        partnerHotels: '协作酒店',
        mapTitle: '酒店位置地图',
        bookingTitle: '预订方式',
      },
      sponsor: {
        seoTitle: '参展赞助',
        tiersTitle: '赞助级别与权益',
        thTier: '级别',
        thPrice: '价格',
        thQuota: '名额',
        thBenefits: '主要权益',
        adTitle: '广告位与单项合作',
        quotaLimited: '限 {quota}',
        contactTitle: '洽谈与付款',
      },
    },
  },
  en: {
    content: {
      org: {
        seoTitle: 'Organizers',
        note: 'The roster is subject to the second circular. To update an institution or committee member entry, please contact the secretariat.',
      },
      transport: {
        seoTitle: 'Venue & Transportation',
        listHint: 'Click any place to focus the map on it',
        viewing: 'Viewing: {name}',
        showingAll: 'Showing all transit points · Click a list entry to focus on one place',
      },
      hotels: {
        seoTitle: 'Hotels',
        partnerHotels: 'Partner Hotels',
        mapTitle: 'Hotel Map',
        bookingTitle: 'How to Book',
      },
      sponsor: {
        seoTitle: 'Exhibition & Sponsorship',
        tiersTitle: 'Sponsorship Tiers & Benefits',
        thTier: 'Tier',
        thPrice: 'Price',
        thQuota: 'Quota',
        thBenefits: 'Key Benefits',
        adTitle: 'Advertising & Individual Opportunities',
        quotaLimited: 'Limited to {quota}',
        contactTitle: 'Contact & Payment',
      },
    },
  },
}
