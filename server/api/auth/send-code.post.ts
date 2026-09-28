import { sendCodeSchema } from '#shared/schemas/auth'
import { requestEmailCode } from '../../services/auth.service'
import { getMailer } from '../../services/mail.service'
import { parseBody, sendDomainError } from '../../utils/validation'
import { enforceRateLimit } from '../../utils/rate-limit'

/**
 * Sends a 6-digit verification code (signup or password reset).
 * Dev mode (no SMTP configured): the response carries `devCode` so the flow
 * is testable end-to-end; the code is also printed to the server log.
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth-send-code', 10, 10 * 60_000)
  try {
    const { email, purpose } = await parseBody(event, sendCodeSchema)
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
