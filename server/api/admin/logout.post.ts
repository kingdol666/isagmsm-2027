import { clearAdminSessionCookie } from '../../utils/session'

export default defineEventHandler((event) => {
  clearAdminSessionCookie(event)
  return { ok: true }
})
