import { z } from 'zod'

/** Participant form — validated client-side AND re-validated server-side. */
export const participantSchema = z.object({
  typeId: z.uuid(),
  fullName: z.string().trim().min(1, '请填写姓名').max(200),
  englishName: z.string().trim().max(200).optional().default(''),
  email: z.email('请填写有效的邮箱地址').max(320),
  phone: z.string().trim().min(1, '请填写手机号').max(40),
  affiliation: z.string().trim().min(1, '请填写单位').max(300),
  department: z.string().trim().max(200).optional().default(''),
  position: z.string().trim().max(120).optional().default(''),
  country: z.string().trim().min(1, '请填写国家 / 地区').max(100),
  dietary: z.string().trim().max(200).optional().default(''),
  invoiceRequired: z.boolean().optional().default(false),
  invoiceTitle: z.string().trim().max(300).optional().default(''),
  /** 蜜罐字段（页面上的隐藏输入）—— 机器人填了它就拒绝：反垃圾报名 */
  website: z.string().max(0, '提交被拒绝').optional().default(''),
})

export type ParticipantInput = z.output<typeof participantSchema>

export const createRegistrationRequestSchema = z.object({
  participant: participantSchema,
})

export const lookupByEmailSchema = z.object({
  email: z.email(),
})
