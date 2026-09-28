import { resetPasswordSchema } from '#shared/schemas/auth'
import { resetPassword } from '../../services/auth.service'
import { parseBody, sendDomainError } from '../../utils/validation'
import { enforceRateLimit } from '../../utils/rate-limit'
import { clearUserSessionCookie } from '../../utils/session'

/** Resets the password with the emailed code; signs the user out for safety. */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth-reset', 10, 10 * 60_000)
  try {
    const body = await parseBody(event, resetPasswordSchema)
    const db = useDb()
    const result = await resetPassword(db, body)
    clearUserSessionCookie(event)
    return { ok: true, userId: result.userId }
  }
  catch (error) {
    sendDomainError(error)
  }
})
