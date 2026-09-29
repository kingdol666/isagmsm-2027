import { z } from 'zod'
import { submitPaymentClaim } from '../../../services/review.service'
import { assertUuidParam, parseBody, sendDomainError } from '../../../utils/validation'
import { requireUser } from '../../../utils/session'
import { enforceRateLimit } from '../../../utils/rate-limit'

const claimSchema = z.object({
  reference: z.string().trim().max(120).optional().default(''),
})

/** 参会人提交对公转账审核（附言/流水号）。 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'order-claim', 20, 60_000)
  try {
    const session = requireUser(event)
    const orderId = assertUuidParam(getRouterParam(event, 'id'))
    const { reference } = await parseBody(event, claimSchema)
    const db = useDb()
    return await submitPaymentClaim(db, orderId, session.userId, reference)
  }
  catch (error) {
    sendDomainError(error)
  }
})
