import { getSession } from '../../utils/session'

/** 当前扫码端 staff 会话（或 null）。 */
export default defineEventHandler((event) => {
  return { user: getSession(event) }
})
