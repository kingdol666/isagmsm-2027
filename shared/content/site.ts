import type {
  ImportantDate,
  OrgSection,
  ProgramDay,
  RegistrationTypeContent,
  SiteNavItem,
  SiteSpeaker,
  SponsorAdItem,
  SponsorTier,
  TransitItem,
} from '../types/site'

/**
 * ISAGMSM 全站内容 — 唯一内容源（CMS-like config）。
 * 标注「示例数据」的内容（讲者、酒店、赞助商、联系人等）为占位信息，
 * 正式发布前请在会议组委会确认后替换。
 */

export const siteMeta = {
  shortName: 'ISAGMSM',
  name: 'ISAGMSM 2026',
  fullNameZh: '第五届先进凝胶材料与软物质国际学术研讨会',
  fullNameEn: 'The 5th International Symposium for Advanced Gel Materials & Soft Matters',
  theme: '凝胶赋能 · 软物智造',
  dates: '2026年4月24—26日',
  datesShort: '2026·4·24-26',
  location: '中国 · 合肥',
  email: 'isagmsm@conference.example.org',
  abstractsEmail: 'abstracts@conference.example.org',
  copyright: '© 2026 ISAGMSM 组织委员会',
  /* 重要日期横幅（header 下方，参照学术会议官网形态） */
  bannerDates: [
    '会前缴费优惠期至2026年3月25日',
    '征稿截止2026年3月25日',
  ],
} as const

export const siteNav: SiteNavItem[] = [
  { code: '01', label: '首 页', href: '/' },
  { code: '02', label: '组织机构', href: '/organization' },
  { code: '03', label: '征文投稿', href: '/abstracts' },
  { code: '04', label: '参会注册', href: '/registration' },
  { code: '05', label: '会场交通', href: '/transportation' },
  { code: '06', label: '酒店预定', href: '/hotels' },
  { code: '07', label: '参展赞助', href: '/sponsorship' },
]

export const aboutContent = {
  code: 'PPS26—01',
  tag: '会议简介',
  title: '会议简介',
  facts: [
    { label: '会期', value: '3天（4月24日报到）' },
    { label: '议题', value: '6大研究方向' },
    { label: '形式', value: '大会报告 · 分会报告 · 墙报' },
  ],
  paragraphs: [
    '先进凝胶材料与软物质是材料科学与生命健康交叉领域最活跃的研究前沿之一。第五届先进凝胶材料与软物质国际学术研讨会（ISAGMSM 2026）将围绕凝胶材料的设计合成、软物质物理、智能响应体系、生物医用转化与规模产业化等方向，汇集国内外高校、科研院所与产业界的专家学者，交流最新研究进展。',
    '会议同期设置大会报告、分会报告与墙报交流，并为青年学者与研究生提供展示平台。我们期待与您在合肥相聚，共同探讨凝胶与软物质领域的未来。',
    '（会议简介为示例文案，请组委会审定后替换。）',
  ],
} as const

/* 征文主题（6 大方向，示例划分，请组委会确认） */
export const themesContent = {
  code: 'ISAGMSM—02',
  tag: '06 研究方向',
  title: '征文',
  titleEm: '主题',
  items: [
    { no: 'A', title: '凝胶材料设计与合成', desc: '水凝胶、有机凝胶、离子凝胶、气凝胶的分子设计与可控合成' },
    { no: 'B', title: '软物质物理与结构', desc: '凝胶化机理、网络结构与动力学、流变学、自组装与界面科学' },
    { no: 'C', title: '刺激响应与智能凝胶', desc: '温敏/pH/光/电/磁响应体系、驱动器、软体机器人' },
    { no: 'D', title: '生物医用凝胶材料', desc: '组织工程、药物递送、伤口敷料、细胞培养与生物打印' },
    { no: 'E', title: '表征、建模与人工智能', desc: '大科学装置表征、多尺度模拟、数据驱动与机器学习' },
    { no: 'F', title: '产业化与应用', desc: '柔性电子、能源器件、农业与消费品、规模制备与工程化' },
  ],
} as const

/* 示例讲者 — 虚构人名与机构用于模板演示，正式名单由组委会确认后替换 */
export const speakersContent: { code: string; tag: string; items: SiteSpeaker[] } = {
  code: 'ISAGMSM—03',
  tag: '4 场大会报告（拟邀）',
  items: [
    {
      code: 'K—01',
      name: 'Prof. 林致远',
      affiliation: '中国科学技术大学',
      talk: '双网络离子凝胶的界面增强策略',
      monogram: '林',
    },
    {
      code: 'K—02',
      name: 'Prof. Marika Tanaka',
      affiliation: '东京大学',
      talk: '仿生水凝胶中的滑移环网络设计',
      monogram: 'M',
    },
    {
      code: 'K—03',
      name: 'Prof. 陈望舒',
      affiliation: '浙江大学',
      talk: '刺激响应凝胶驱动器的产业化路径',
      monogram: '陈',
    },
    {
      code: 'K—04',
      name: 'Prof. Lars Andersen',
      affiliation: '哥本哈根大学',
      talk: 'Dynamic Hydrogels for Cell Culture',
      monogram: 'L',
    },
  ]
}

export const programContent: { code: string; tag: string; title: string; days: ProgramDay[] } = {
  code: 'ISAGMSM—04',
  tag: '3 天 · 报到 + 开幕 + 分会',
  title: '会议日程',
  days: [
    {
      id: 'day1',
      label: '第 1 天 · 4月24日',
      date: '4月24日 · 报到日',
      items: [
        { time: '14:00–20:00', name: '会议报到', room: '酒店大堂' },
        { time: '19:00–21:00', name: '青年学者沙龙', room: '分会场一' },
      ],
    },
    {
      id: 'day2',
      label: '第 2 天 · 4月25日',
      date: '4月25日 · 开幕日',
      items: [
        { time: '08:30–09:00', name: '开幕式', room: '主会场' },
        { time: '09:00–12:00', name: '大会报告', room: '主会场', keynote: true },
        { time: '13:30–18:00', name: '分会报告 A / B', room: '分会场' },
      ],
    },
    {
      id: 'day3',
      label: '第 3 天 · 4月26日',
      date: '4月26日 · 分会日',
      items: [
        { time: '08:30–12:00', name: '分会报告 C / D', room: '分会场' },
        { time: '13:30–16:00', name: '墙报交流', room: '墙报区' },
        { time: '16:00–16:30', name: '闭幕式与颁奖', room: '主会场' },
      ],
    },
  ]
}

export const datesContent: { code: string; tag: string; title: string; items: ImportantDate[] } = {
  code: 'ISAGMSM—05',
  tag: '时间节点',
  title: '重要日期',
  items: [
    { label: '征稿截止', date: '2026年3月25日' },
    { label: '征文录用通知', date: '2026年4月5日' },
    { label: '会前缴费优惠截止', date: '2026年3月25日' },
    { label: '研讨会', date: '2026年4月24—26日', hot: true },
  ]
}

/* 组织机构（示例结构 — 名单为占位，请组委会确认后替换） */
export const organizationContent: { code: string; tag: string; title: string; sections: OrgSection[] } = {
  code: 'ISAGMSM—06',
  tag: '组织机构',
  title: '组织机构',
  sections: [
    {
      title: '主办单位',
      kind: 'units',
      entries: [
        { name: '（主办单位名称 — 待组委会确认）' },
      ],
    },
    {
      title: '承办单位',
      kind: 'units',
      entries: [
        { name: '（承办单位名称 — 待组委会确认）' },
      ],
    },
    {
      title: '大会领导',
      kind: 'people',
      entries: [
        { role: '大会主席', name: '（待确认）' },
        { role: '会议执行主席', name: '（待确认）' },
        { role: '会议秘书', name: '（待确认）' },
      ],
    },
    {
      title: '学术委员会',
      kind: 'people',
      entries: [
        { role: '主任', name: '（待确认）' },
        { role: '副主任', name: '（待确认 · 按姓氏笔画排序）' },
        { role: '委员', name: '（待确认 · 按姓氏笔画排序）' },
      ],
    },
    {
      title: '组织委员会',
      kind: 'people',
      entries: [
        { role: '主任', name: '（待确认）' },
        { role: '委员', name: '（待确认）' },
      ],
    },
  ]
}

/* 征文投稿 */
export const abstractsContent = {
  code: 'ISAGMSM—07',
  tag: '征文投稿',
  title: '征文投稿',
  intro: '凡符合会议主题且未在国内外刊物或会议上发表过的论文均可应征。摘要中英文均可，篇幅不超过一页 A4 纸，请按会议模板书写，文责自负。',
  requirements: [
    '摘要篇幅不超过一页 A4 纸，中英文均可，按会议模板书写（模板见下载专区）',
    '投稿时需选择主题方向与报告类别（口头报告 / 墙报 / 仅提交摘要），最终类别由学术委员会审议确定',
    '墙报建议尺寸 90cm（宽）× 120cm（高），请自行彩打并带至现场',
    '投稿截止 2026年3月25日；录用通知将于 2026年4月5日前发送至投稿邮箱',
  ],
  submit: {
    channel: '请将摘要（Word 格式）发送至投稿邮箱，邮件标题注明「ISAGMSM投稿-姓名-主题方向」',
    email: 'abstracts@conference.example.org',
    deadline: '2026年3月25日',
  },
  contact: '征文联系人：会议秘书处（abstracts@conference.example.org · 电话待公布）',
} as const

/* 参会注册（信息页 + 在线报名入口） */
export const registrationInfoContent = {
  code: 'ISAGMSM—08',
  tag: '参会注册',
  title: '参会注册',
  /* 注册费表（示例价格，请组委会确认后替换） */
  feeTable: {
    note: '注册费包括会议费、资料费等（不含住宿）',
    headers: ['类别', '会前缴费（2026/3/25 前）', '会后缴费'],
    rows: [
      ['正式代表', '¥2,000', '¥2,400'],
      ['学生代表（凭证件）', '¥1,200', '¥1,600'],
    ],
  },
  steps: [
    '在线注册：点击下方「立即报名」，填写参会信息并提交，系统自动生成唯一参会 ID（ISAGMSM-xxxxxx）',
    '对公转账：按本页账户信息转账，转账附言务必注明「参会ID-姓名」（如 ISAGMSM-000012-张三）',
    '提交审核：转账完成后在支付页点击「我已完成转账」，填写转账流水号提交会务组审核',
    '获取凭证：会务组核对转账记录后审批通过，系统自动下发电子凭证（含现场签到二维码）',
  ],
  bank: {
    accountName: '（对公账户户名 — 待组委会确认）',
    bank: '（开户银行 — 待组委会确认）',
    accountNumber: '（银行账号 — 待组委会确认）',
    remarkFormat: '参会ID-姓名',
    deadline: '银行转账截止：2026年4月15日',
  },
  invoice: '发票说明：审批通过后由会务组统一开具，会议现场凭参会 ID 领取。',
  notice: '多人合并转账请附参会人员名单（参会 ID、姓名、金额）；退费申请请于 2026年4月10日前联系会务组，逾期不办理。',
} as const

/* 会场交通（示例信息基于合肥会场，请组委会确认后替换） */
export const transportationContent: { code: string; tag: string; title: string; venueName: string; reportPoint: string; transit: TransitItem[]; mapLabel: string } = {
  code: 'ISAGMSM—09',
  tag: '会场交通',
  title: '会场交通',
  venueName: '合肥 · 会议酒店（具体会场待确认）',
  reportPoint: '报到签到处：会议主酒店大堂（以第二轮通知为准）',
  transit: [
    { code: '机场', name: '合肥新桥国际机场', detail: '距会议酒店约 55 公里，车程 1 小时；机场大巴 / 出租车' },
    { code: '高铁', name: '合肥南站', detail: '距会议酒店约 13 公里，打车约 20 分钟；地铁 1 号线约 40 分钟' },
    { code: '火车', name: '合肥火车站', detail: '距会议酒店约 22 公里，打车约 35 分钟；地铁 1 号线约 1 小时' },
    { code: '地铁', name: '地铁 1 号线', detail: '万达城站 1 号口出，步行至会议酒店' },
  ],
  mapLabel: 'Map — to be embedded',
}

/* 酒店预定（示例酒店信息基于合肥会场，请组委会确认后替换） */
export const hotelsContent = {
  code: 'ISAGMSM—10',
  tag: '酒店预定',
  title: '酒店预定',
  intro: '会务组已协调以下协作酒店并争取协议价格，请尽早预订。预订方式：会议第二轮通知公布后开放在线预订链接。',
  booking: {
    channel: '在线预订链接（第二轮通知公布）/ 会务组协调',
    note: '协议价均含早餐；预订时请注明「ISAGMSM 会议」以享受协议价。',
  },
  hotels: [
    {
      name: '会议主酒店（示例）',
      stars: '五钻',
      price: '¥350 / 间夜（含早）',
      address: '合肥市包河区（详细地址待确认）',
      intro: '会议主会场所在酒店，紧邻会议报告厅，步行即达。',
    },
    {
      name: '协作酒店 A（示例）',
      stars: '五钻',
      price: '¥350 / 间夜（含早）',
      address: '合肥市包河区（详细地址待确认）',
      intro: '距主会场步行约 5 分钟，豪华客房与套房。',
    },
    {
      name: '协作酒店 B（示例）',
      stars: '四钻',
      price: '¥260 / 间夜（含早）',
      address: '合肥市包河区（详细地址待确认）',
      intro: '距主会场车程约 5 分钟，现代客房，性价比之选。',
    },
  ],
} as const

/* 参展赞助（示例价格参考同类会议，请组委会确认后替换） */
export const sponsorshipContent = {
  code: 'ISAGMSM—11',
  tag: '参展赞助',
  title: '参展赞助',
  intro: '会议同期设立企业展区与多种赞助形式，欢迎仪器、耗材、生物科技与新材料企业洽谈合作。',
  tiers: [
    {
      tier: '铂金赞助',
      price: '¥80,000',
      quota: '限 1 家',
      benefits: ['荣誉证书 · 大会支持单位', '展位一个（背景板 + 桌椅）', '免费参会名额 3 人', '会议手册封底彩色广告', '资料袋单页入袋'],
    },
    {
      tier: '金牌赞助',
      price: '¥60,000',
      quota: '限 2 家',
      benefits: ['荣誉证书 · 大会支持单位', '展位一个（背景板 + 桌椅）', '免费参会名额 2 人', '会议手册封三彩色广告'],
    },
    {
      tier: '银牌赞助',
      price: '¥40,000',
      quota: '限 4 家',
      benefits: ['荣誉证书 · 大会支持单位', '展位一个（背景板 + 桌椅）', '会议手册彩色广告'],
    },
  ] satisfies SponsorTier[],
  adItems: [
    { item: '茶歇赞助', benefit: '冠名', price: '¥15,000', quota: '1' },
    { item: '资料入袋', benefit: '单页资料入袋', price: '¥8,000', quota: '5' },
    { item: '分会场报告', benefit: '15 分钟报告时间', price: '¥10,000', quota: '5' },
    { item: '标准展台', benefit: '背景板 + 桌椅 + 电源', price: '¥16,000', quota: '不限' },
  ] satisfies SponsorAdItem[],
  contact: '招商联系人：会务组（sponsor@conference.example.org · 电话待公布）',
  paymentNote: '赞助款项同样通过对公转账支付，汇款请注明「参展赞助-单位名称」。',
} as const

/* 报名票种（显示用；价格以服务端 registration_types 表为准） */
export const registrationContent = {
  code: 'ISAGMSM—12',
  tag: '报名票种',
  title: '报名类别',
  note: '价格单位为人民币元 · 示例价格以缴费页为准',
  types: [
    { code: 'R—01', name: '学生代表', price: 1200, description: '本科生与研究生（报到时出示有效证件）', availability: 'available' },
    { code: 'R—02', name: '正式代表', price: 2000, description: '高校、科研院所教师与研究人员', availability: 'available' },
    { code: 'R—03', name: '企业代表', price: 2400, description: '企业技术人员与商务代表', availability: 'available' },
    { code: 'R—04', name: '特邀报告人', price: 0, description: '由组织委员会邀请', availability: 'on_invitation' },
  ] satisfies RegistrationTypeContent[],
} as const

export const footerContent = {
  line: '2026年4月24—26日 · 中国合肥',
  hostNote: 'Host organisation: to be confirmed',
} as const
