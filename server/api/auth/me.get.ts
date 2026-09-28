import { getUserSession } from '../../utils/session'
import { findUserById } from '../../repositories/users'
import { findByEmail } from '../../repositories/registrations'
import { findCredentialByRegistration } from '../../repositories/credentials'

/** Current participant session + credential summary for the header avatar. */
export default defineEventHandler(async (event) => {
  const session = getUserSession(event)
  if (!session) return { user: null }
  const db = useDb()
  const user = await findUserById(db, session.userId)
  if (!user) return { user: null }

  // latest registration's credential — powers the header 凭证 entry
  const regs = await findByEmail(db, user.email)
  let credentialToken: string | null = null
  let credentialStatus: string | null = null
  for (const { registration } of regs) {
    const credential = await findCredentialByRegistration(db, registration.id)
    if (credential && credential.status === 'active') {
      credentialToken = credential.token
      credentialStatus = credential.status
      break
    }
  }

  return {
    user: {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      hasProfile: Boolean(user.profile),
    },
    credentialToken,
    credentialStatus,
  }
})
