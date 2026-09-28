import { z } from 'zod'
import { approveOrder, rejectOrder } from '../../../../services/review.service'
import { parseBody, sendDomainError } from '../../../../utils/validation'
import { requireAdmin } from '../../../../utils/session'

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(300).optional().default(''),
})

/** 会务组审批：approve = 核对转账通过并下发凭证；reject = 驳回退回待支付。 */
export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const orderId = getRouterParam(event, 'id')
  if (!orderId) throw createError({ statusCode: 400, statusMessage: 'Missing order id' })

  try {
    const { action, note } = await parseBody(event, reviewSchema)
    const db = useDb()
    if (action === 'approve') {
      return await approveOrder(db, orderId, admin)
    }
    return await rejectOrder(db, orderId, admin, note)
  }
  catch (error) {
    sendDomainError(error)
  }
})
