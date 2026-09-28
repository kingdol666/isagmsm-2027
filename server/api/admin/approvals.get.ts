import { listReviewingOrders } from '../../repositories/order-review'
import { findTypeById } from '../../repositories/registration-types'

/** 待审批的对公转账订单（后台缴费审批页）。 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const rows = await listReviewingOrders(db)

  const withTypes = await Promise.all(rows.map(async (row) => {
    const type = await findTypeById(db, row.registration.typeId)
    return {
      orderId: row.order.id,
      orderNo: row.order.orderNo,
      displayId: row.registration.displayId,
      fullName: row.registration.fullName,
      email: row.registration.email,
      affiliation: row.registration.affiliation,
      typeName: type?.name ?? '',
      totalFen: row.order.totalFen,
      currency: row.order.currency,
      reference: row.order.reference,
      claimedAt: row.order.claimedAt,
    }
  }))

  return { rows: withTypes }
})
