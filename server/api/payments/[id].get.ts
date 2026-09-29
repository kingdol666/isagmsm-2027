import { getPaymentView } from '../../services/payment.service'
import { assertUuidParam } from '../../utils/validation'

/** Payment status — polled by the payment page while waiting. */
export default defineEventHandler(async (event) => {
  const id = assertUuidParam(getRouterParam(event, 'id'))
  const db = useDb()
  const view = await getPaymentView(db, id)
  if (!view) throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
  return { payment: view }
})
