import { loginSchema } from '#shared/schemas/auth'
import { login } from '../../services/auth.service'
import { parseBody, sendDomainError } from '../../utils/validation'
import { enforceRateLimit } from '../../utils/rate-limit'
import { setUserSessionCookie } from '../../utils/session'

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth-login', 30, 60_000)
  try {
    const { email, password } = await parseBody(event, loginSchema)
    const db = useDb()
    const account = await login(db, email, password)
    setUserSessionCookie(event, { userId: account.userId, email: account.email, role: 'participant' })
    return { user: { userId: account.userId, email: account.email } }
  }
  catch (error) {
    sendDomainError(error)
  }
})
