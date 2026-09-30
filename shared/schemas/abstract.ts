import { z } from 'zod'

/**
 * 投稿送审 — 客户端与服务端共用同一校验。
 * 每位作者（含第一作者）都必须填写姓名与机构。
 */

export const ABSTRACT_TOPICS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export type AbstractTopic = (typeof ABSTRACT_TOPICS)[number]

export const ABSTRACT_REPORT_TYPES = ['oral', 'poster', 'abstract_only'] as const
export type AbstractReportType = (typeof ABSTRACT_REPORT_TYPES)[number]

export const abstractStatuses = ['submitted', 'accepted', 'returned', 'withdrawn'] as const
export type AbstractStatus = (typeof abstractStatuses)[number]

/* ── 稿件附件（对象存储 OSS）────────────────────────────────
 * 每次投稿/重投必须附带一份 Word 或 PDF 附件，≤10MB；
 * 每个版本独立存储（abstract_events 的投稿/重投事件各挂一份附件元数据）。
 */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_EXTENSIONS = ['pdf', 'doc', 'docx'] as const
export type AttachmentExtension = (typeof ATTACHMENT_EXTENSIONS)[number]
/** <input accept> 与页面文案共用 */
export const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx'

export function formatAttachmentSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export const abstractAuthorSchema = z.object({
  name: z.string().trim().min(1, '请填写作者姓名').max(120),
  affiliation: z.string().trim().min(1, '请填写该作者的机构').max(300),
})

export const submitAbstractSchema = z.object({
  title: z.string().trim().min(2, '请填写稿件标题').max(300),
  topic: z.enum(ABSTRACT_TOPICS, { message: '请选择主题方向' }),
  reportType: z.enum(ABSTRACT_REPORT_TYPES, { message: '请选择报告类别' }),
  abstractText: z.string().trim().min(30, '摘要正文至少 30 字').max(8000, '摘要正文过长'),
  submitterName: z.string().trim().min(1, '请填写姓名').max(120),
  submitterAffiliation: z.string().trim().min(1, '请填写机构').max(300),
  authors: z.array(abstractAuthorSchema).min(1, '至少填写一位作者').max(20, '作者最多 20 位'),
  /** 蜜罐字段（页面上的隐藏输入）—— 机器人填了它就拒绝：反垃圾投稿 */
  website: z.string().max(0, '提交被拒绝').optional().default(''),
})

export type SubmitAbstractInput = z.output<typeof submitAbstractSchema>

export const resubmitAbstractSchema = submitAbstractSchema

export const reviewAbstractSchema = z.object({
  action: z.enum(['accept', 'return']),
  comment: z.string().trim().max(4000).optional().default(''),
}).refine(data => data.action !== 'return' || data.comment.length >= 5, {
  message: '返稿时必须填写至少 5 个字的返稿意见',
  path: ['comment'],
})

export type ReviewAbstractInput = z.output<typeof reviewAbstractSchema>
