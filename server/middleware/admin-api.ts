const ADMIN_PREFIX = '/api/admin'
const PUBLIC_ADMIN_ROUTES = ['/api/admin/login']
const CHECKIN_PREFIX = '/api/checkin'

/**
 * API guard: /api/admin/** requires a session (login is public); /api/checkin/**
 * requires staff or admin (the scanner app signs in with its staff account).
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (path.startsWith(ADMIN_PREFIX)) {
    if (PUBLIC_ADMIN_ROUTES.includes(path)) return
    requireSession(event)
    return
  }
  if (path.startsWith(CHECKIN_PREFIX)) {
    requireStaff(event)
  }
})
