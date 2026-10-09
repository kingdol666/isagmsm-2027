import { listPaymentOrders } from '../repositories/console'

/** 支付订单总览：以订单为中心（含对公转账/未发起在线支付的订单），支持状态与渠道筛选。 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = useDb()
  const rows = await listPaymentOrders(db, {
    status: typeof query.status === 'string' ? query.status : undefined,
    provider: typeof query.provider === 'string' ? query.provider : undefined,
  })
  return { rows }
})
