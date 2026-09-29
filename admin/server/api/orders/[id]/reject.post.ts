import { z } from 'zod'
import { rejectOrderPayment } from '../../../services/console.service'
import { parseBody, sendDomainError } from '../../../utils/validation'

const schema = z.object({ note: z.string().trim().max(300).optional().default('') })

/** 驳回：订单退回待支付，参会人可补充后重新提交审核。 */
export default defineEventHandler(async (event) => {
  try {
    const admin = requireConsoleAdmin(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing order id' })
    const { note } = await parseBody(event, schema)
    const db = useDb()
    return await rejectOrderPayment(db, id, { userId: admin.userId, username: admin.username }, note)
  }
  catch (error) {
    sendDomainError(error)
  }
})
