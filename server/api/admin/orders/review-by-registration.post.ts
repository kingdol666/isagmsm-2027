import { z } from 'zod'
import { approveOrder } from '../../../services/review.service'
import { findLatestOrderForRegistration } from '../../../repositories/orders'
import { parseBody, sendDomainError } from '../../../utils/validation'
import { requireAdmin } from '../../../utils/session'

const schema = z.object({
  registrationId: z.uuid(),
})

/** 管理端按报名 ID 确认收款（线下收款场景）：最新待付订单审批通过并下发凭证。 */
export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  try {
    const { registrationId } = await parseBody(event, schema)
    const db = useDb()
    const order = await findLatestOrderForRegistration(db, registrationId)
    if (!order) throw createError({ statusCode: 404, statusMessage: '该报名暂无缴费订单' })
    return await approveOrder(db, order.id, admin)
  }
  catch (error) {
    sendDomainError(error)
  }
})
