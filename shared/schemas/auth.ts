import { z } from 'zod'

export const emailPurposeSchema = z.enum(['signup', 'reset'])

export const sendCodeSchema = z.object({
  email: z.email('A valid email is required').max(320),
  purpose: emailPurposeSchema,
})

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)

export const registerAccountSchema = z.object({
  email: z.email('A valid email is required').max(320),
  code: z.string().trim().regex(/^\d{6}$/, 'The code is 6 digits'),
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'Your name is required').max(200),
  /** 蜜罐字段（页面上的隐藏输入）—— 机器人填了它就拒绝：反垃圾注册 */
  website: z.string().max(0, '提交被拒绝').optional().default(''),
})

export const loginSchema = z.object({
  email: z.email('A valid email is required').max(320),
  password: z.string().min(1, 'Password is required').max(128),
})

export const resetPasswordSchema = z.object({
  email: z.email().max(320),
  code: z.string().trim().regex(/^\d{6}$/, 'The code is 6 digits'),
  password: passwordSchema,
})

/** Account-level participant profile (prefills conference registrations). */
export const accountProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Your name is required').max(200),
  englishName: z.string().trim().max(200).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  affiliation: z.string().trim().min(1, 'Affiliation is required').max(300),
  department: z.string().trim().max(200).optional().default(''),
  position: z.string().trim().max(120).optional().default(''),
  country: z.string().trim().min(1, 'Country / region is required').max(100),
  dietary: z.string().trim().max(200).optional().default(''),
})

export type AccountProfile = z.output<typeof accountProfileSchema>
