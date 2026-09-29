import { getConsoleSession } from '../utils/session'

export default defineEventHandler((event) => {
  return { user: getConsoleSession(event) }
})
