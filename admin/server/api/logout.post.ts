import { clearConsoleSessionCookie } from '../utils/session'

export default defineEventHandler((event) => {
  clearConsoleSessionCookie(event)
  return { ok: true }
})
