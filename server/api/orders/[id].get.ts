import { findOrderById } from '../../repositories/orders'
import { findCredentialByRegistration } from '../../repositories/credentials'
import { findRegistrationDetail } from '../../repositories/registrations'

/** 订单状态（参会人轮询 + 支付页渲染）：含参会 ID 与审核信息。 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing order id' })
  const db = useDb()
  const order = await findOrderById(db, id)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  const detail = await findRegistrationDetail(db, order.registrationId)

  let credentialToken: string | null = null
  if (order.status === 'paid') {
    const credential = await findCredentialByRegistration(db, order.registrationId)
    credentialToken = credential?.token ?? null
  }

  return {
    order: {
      id: order.id,
      orderNo: order.orderNo,
      registrationId: order.registrationId,
      displayId: detail?.registration.displayId ?? '',
      fullName: detail?.registration.fullName ?? '',
      subtotalFen: order.subtotalFen,
      discountFen: order.discountFen,
      totalFen: order.totalFen,
      currency: order.currency,
      status: order.status,
      reference: order.reference,
      claimedAt: order.claimedAt,
      reviewNote: order.reviewNote,
    },
    credentialToken,
  }
})
