import { findOrderById } from '../../repositories/orders'
import { findCredentialByRegistration } from '../../repositories/credentials'

/** Order status for polling; exposes the credential token once paid. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing order id' })
  const db = useDb()
  const order = await findOrderById(db, id)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

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
      subtotalFen: order.subtotalFen,
      discountFen: order.discountFen,
      totalFen: order.totalFen,
      currency: order.currency,
      status: order.status,
    },
    credentialToken,
  }
})
