import { getUserSession } from '../../utils/session'
import { findUserById } from '../../repositories/users'

/** Current participant session (null when anonymous). */
export default defineEventHandler(async (event) => {
  const session = getUserSession(event)
  if (!session) return { user: null }
  const db = useDb()
  const user = await findUserById(db, session.userId)
  if (!user) return { user: null }
  return {
    user: {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      hasProfile: Boolean(user.profile),
    },
  }
})
