import { findOrderById } from '../../repositories/orders'
import { findCredentialByRegistration } from '../../repositories/credentials'
import { findRegistrationDetail } from '../../repositories/registrations'
import { assertUuidParam } from '../../utils/validation'
import { requireUser } from '../../utils/session'

/**
 * 订单状态（参会人轮询 + 支付页渲染）：含参会 ID 与审核信息。
 * 仅订单归属人可见（越权一律 404）——响应含凭证 token，绝不允许匿名读取。
 */
export default defineEventHandler(async (event) => {
  const session = requireUser(event)
  const id = assertUuidParam(getRouterParam(event, 'id'))
  const db = useDb()
  const order = await findOrderById(db, id)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  const detail = await findRegistrationDetail(db, order.registrationId)
  if (detail?.registration.userId !== session.userId) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

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
