import { clearUserSessionCookie } from '../../utils/session'

export default defineEventHandler((event) => {
  clearUserSessionCookie(event)
  return { ok: true }
})
