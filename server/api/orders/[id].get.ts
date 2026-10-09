import { expireStaleOrders, findOrderById } from '../../repositories/orders'
import { findCredentialByRegistration } from '../../repositories/credentials'
import { findRegistrationDetail } from '../../repositories/registrations'
import { findLatestPaymentForOrder } from '../../repositories/payments'
import { reconcilePendingPayment } from '../../services/payment.service'
import { assertUuidParam } from '../../utils/validation'
import { requireUser } from '../../utils/session'

/** 对账节流：同一支付至少间隔 15s 才再向渠道主动查单（进程内，足够此规模）。 */
const RECONCILE_INTERVAL_MS = 15_000
/** 支付创建后先等一等 —— 刚生成的二维码立刻查单没有意义。 */
const RECONCILE_MIN_AGE_MS = 20_000
const lastReconcileAt = new Map<string, number>()

async function maybeReconcile(orderId: string) {
  const config = useRuntimeConfig()
  const db = useDb()
  const payment = await findLatestPaymentForOrder(db, orderId)
  if (!payment || payment.status !== 'pending') return
  const age = Date.now() - new Date(payment.createdAt).getTime()
  if (age < RECONCILE_MIN_AGE_MS) return
  const last = lastReconcileAt.get(payment.id) ?? 0
  if (Date.now() - last < RECONCILE_INTERVAL_MS) return
  lastReconcileAt.set(payment.id, Date.now())
  if (lastReconcileAt.size > 1000) lastReconcileAt.clear() // 防御性清空
  try {
    await reconcilePendingPayment(db, payment.id, config.mockPaymentSecret)
  }
  catch { /* 对账失败不影响订单读取 */ }
}

/**
 * 订单状态（参会人轮询 + 支付页渲染）：含参会 ID 与审核信息。
 * 仅订单归属人可见（越权一律 404）——响应含凭证 token，绝不允许匿名读取。
 * 待支付订单顺带做主动对账（webhook 丢失时的兜底，见 payment.service）。
 */
export default defineEventHandler(async (event) => {
  const session = requireUser(event)
  const id = assertUuidParam(getRouterParam(event, 'id'))
  const db = useDb()
  await expireStaleOrders(db) // TTL 惰性过期：过期订单立即呈现 expired + 可重新下单
  let order = await findOrderById(db, id)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  const detail = await findRegistrationDetail(db, order.registrationId)
  if (detail?.registration.userId !== session.userId) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

  if (order.status === 'pending') {
    await maybeReconcile(order.id)
    order = (await findOrderById(db, id)) ?? order // 对账可能已将其置为 paid
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
