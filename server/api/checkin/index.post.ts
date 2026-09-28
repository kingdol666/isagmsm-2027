import { z } from 'zod'
import { checkinByToken } from '../../services/checkin.service'
import { parseBody, sendDomainError } from '../../utils/validation'

const checkinSchema = z.object({
  token: z.string().trim().min(10).max(200),
  method: z.enum(['scan', 'manual']).optional().default('scan'),
})

/** Confirm the check-in. Duplicate attempts return duplicate=true, never double-record. */
export default defineEventHandler(async (event) => {
  const session = requireStaff(event)
  try {
    const { token, method } = await parseBody(event, checkinSchema)
    const db = useDb()
    const normalized = token.includes('/verify/') ? token.split('/verify/')[1]!.split(/[?#]/)[0]! : token
    const result = await checkinByToken(db, normalized, method, session.userId)
    return result
  }
  catch (error) {
    sendDomainError(error)
  }
})
