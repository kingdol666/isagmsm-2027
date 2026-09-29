import { registerAccountSchema } from '#shared/schemas/auth'
import { registerAccount } from '../../services/auth.service'
import { parseBody, sendDomainError } from '../../utils/validation'
import { enforceRateLimit } from '../../utils/rate-limit'
import { setUserSessionCookie } from '../../utils/session'

/** Email-code sign-up: verifies the code, creates the account, signs the user in. */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth-register', 30, 10 * 60_000)
  try {
    const body = await parseBody(event, registerAccountSchema)
    const db = useDb()
    const account = await registerAccount(db, body)
    setUserSessionCookie(event, { userId: account.userId, email: account.email, role: 'participant' })
    setResponseStatus(event, 201)
    return { user: { userId: account.userId, email: account.email } }
  }
  catch (error) {
    sendDomainError(error)
  }
})
