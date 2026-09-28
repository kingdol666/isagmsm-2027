import type { AccountProfile } from '#shared/schemas/auth'
import { accountProfileSchema } from '#shared/schemas/auth'
import { getUserSession } from '../../utils/session'
import { findUserById } from '../../repositories/users'
import { updateProfile } from '../../services/auth.service'
import { parseBody, sendDomainError } from '../../utils/validation'

/** GET = current profile · PUT = complete/update the participant profile. */
export default defineEventHandler(async (event) => {
  const session = getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Please sign in to continue' })
  }
  const db = useDb()

  if (event.method === 'GET') {
    const user = await findUserById(db, session.userId)
    if (!user) throw createError({ statusCode: 404, statusMessage: 'Account not found' })
    return { profile: user.profile as AccountProfile | null, email: user.email, fullName: user.fullName }
  }

  if (event.method === 'PUT') {
    try {
      const profile = await parseBody(event, accountProfileSchema)
      const user = await updateProfile(db, session.userId, profile.fullName, profile)
      return { profile: user.profile }
    }
    catch (error) {
      sendDomainError(error)
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
