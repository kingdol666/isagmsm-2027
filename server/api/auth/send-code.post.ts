import { sendCodeSchema } from '#shared/schemas/auth'
import { requestEmailCode } from '../../services/auth.service'
import { getMailer } from '../../services/mail.service'
import { findUserByEmail } from '../../repositories/users'
import { parseBody, sendDomainError } from '../../utils/validation'
import { enforceRateLimit } from '../../utils/rate-limit'

/**
 * 发送 6 位邮箱验证码（signup | reset）。
 * signup 场景：邮箱已完成注册时直接拦截——不发码、提示登录，防止重复注册。
 * Dev 模式（MAIL_DRIVER=test 或未配 SMTP）：响应携带 devCode 供本地演示。
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth-send-code', 10, 10 * 60_000)
  try {
    const { email, purpose } = await parseBody(event, sendCodeSchema)

    if (purpose === 'signup') {
      const existing = await findUserByEmail(useDb(), email)
      if (existing?.passwordHash) {
        throw createError({
          statusCode: 409,
          statusMessage: '该邮箱已完成注册，请直接登录',
          data: { registered: true },
        })
      }
    }

    const db = useDb()
    const code = await requestEmailCode(db, email, purpose)
    const { mailer, devMode } = getMailer(process.env)
    await mailer.sendVerificationCode(email, code, purpose)
    return { sent: true, ...(devMode ? { devCode: code } : {}) }
  }
  catch (error) {
    sendDomainError(error)
  }
})
