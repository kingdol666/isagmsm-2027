import { z } from 'zod'
import { requestEmailCode } from '../../services/auth.service'
import { getMailer } from '../../services/mail.service'
import { parseBody, sendDomainError } from '../../utils/validation'
import { enforceRateLimit } from '../../utils/rate-limit'

const forgotSchema = z.object({ email: z.email().max(320) })

/**
 * Requests a password-reset code. Always responds `sent: true` (never reveals
 * whether the email is registered); the reset step validates the code + account.
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth-forgot', 30, 10 * 60_000)
  try {
    const { email } = await parseBody(event, forgotSchema)
    const db = useDb()
    const code = await requestEmailCode(db, email, 'reset')
    const { mailer, devMode } = getMailer(process.env)
    await mailer.sendVerificationCode(email, code, 'reset').catch(() => {})
    return { sent: true, ...(devMode ? { devCode: code } : {}) }
  }
  catch (error) {
    sendDomainError(error)
  }
})
