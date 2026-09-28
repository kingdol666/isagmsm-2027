import { getPaymentView } from '../../services/payment.service'

/** Payment status — polled by the payment page while waiting. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing payment id' })
  const db = useDb()
  const view = await getPaymentView(db, id)
  if (!view) throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
  return { payment: view }
})
