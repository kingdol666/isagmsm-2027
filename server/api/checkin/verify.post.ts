import { z } from 'zod'
import { verifyByToken } from '../../services/checkin.service'
import { parseBody, sendDomainError } from '../../utils/validation'

const verifySchema = z.object({
  token: z.string().trim().min(10).max(200),
})

/** Staff pre-check: what does this QR/token point at? (read-only) */
export default defineEventHandler(async (event) => {
  requireStaff(event)
  try {
    const { token } = await parseBody(event, verifySchema)
    const db = useDb()
    // accept raw tokens and full verify URLs (scanned with any camera app)
    const normalized = token.includes('/verify/') ? token.split('/verify/')[1]!.split(/[?#]/)[0]! : token
    return await verifyByToken(db, normalized)
  }
  catch (error) {
    sendDomainError(error)
  }
})
