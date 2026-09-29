import { approveOrderPayment } from '../../../services/console.service'
import { assertUuidParam, sendDomainError } from '../../../utils/validation'

/** 收款确认：订单→已支付 + 报名→已确认；会员同时自动下发凭证（非会员不发）。 */
export default defineEventHandler(async (event) => {
  try {
    const admin = requireConsoleAdmin(event)
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const db = useDb()
    return await approveOrderPayment(db, id, { userId: admin.userId, username: admin.username })
  }
  catch (error) {
    sendDomainError(error)
  }
})
