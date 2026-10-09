import { randomUUID } from 'node:crypto'
import type { Db } from '../db'
import { DomainError } from './registration.service'
import { getPaymentProvider } from '../payments'
import type { ProviderCallbackEvent, ProviderPaymentStatus } from '../payments'
import { annotatePaymentPayload, createPayment, findLatestPaymentForOrder, findPaymentByProviderNo, findPaymentById, recordPaymentEvent, transitionPayment } from '../repositories/payments'
import { findOrderById, transitionOrder } from '../repositories/orders'
import { confirmIfSubmitted, markRegistrationMember } from '../repositories/registrations'
import { markOrderPaidInTx } from './order.service'
import { ensureCredential } from './credential.service'

export interface PaymentView {
  id: string
  orderId: string
  provider: string
  status: string
  amountFen: number
  currency: string
  payload: Record<string, unknown> | null
}

/** Creates the provider payment. Amount comes from the order row, never the client. */
export async function createPaymentForOrder(db: Db, orderId: string, providerName: string, mockSecret: string) {
  const order = await findOrderById(db, orderId)
  if (!order) throw new DomainError(404, 'Order not found')
  if (order.status !== 'pending') {
    throw new DomainError(409, `Order is ${order.status}, no payment can be created`)
  }

  // Reuse a still-pending payment instead of stacking duplicate attempts
  // (e.g. the payment page auto-starts a payment on every load).
  const latest = await findLatestPaymentForOrder(db, order.id)
  if (latest && latest.status === 'pending') {
    return latest
  }

  const provider = getPaymentProvider(providerName, { mockPaymentSecret: mockSecret })
  const paymentId = randomUUID()
  let result
  try {
    result = await provider.createPayment({
      paymentId,
      orderNo: order.orderNo,
      amountFen: order.totalFen,
      description: `ISAGMSM 2027 registration ${order.orderNo}`,
    })
  }
  catch (error) {
    // 渠道侧失败（签名/网关/产品未签约等）—— 带原因抛出，前端直接展示；不落库，可重试
    throw new DomainError(502, `Payment initiation failed: ${(error as Error).message}`)
  }

  const payment = await createPayment(db, {
    id: paymentId,
    orderId: order.id,
    provider: provider.name,
    providerPaymentNo: result.providerPaymentNo,
    amountFen: order.totalFen,
    currency: order.currency,
    status: 'pending',
    payload: result.payload,
  })

  return payment
}

/**
 * Single entry point for provider callbacks. Guarantees:
 *  - signature already verified by the caller via provider.verifyCallback
 *  - idempotency: each (provider, eventId) is processed at most once
 *  - amount tamper check against the stored order
 *  - PAID transitions are applied transactionally:
 *      payment → paid, order → paid, registration → confirmed, credential issued
 */
export async function handlePaymentCallback(
  db: Db,
  providerName: string,
  event: ProviderCallbackEvent,
) {
  const accepted = await recordPaymentEvent(db, {
    provider: providerName,
    eventId: event.eventId,
    eventType: event.eventType,
    payload: event as unknown as Record<string, unknown>,
  })
  if (!accepted) {
    return { duplicate: true as const }
  }

  const payment = await findPaymentByProviderNo(db, event.providerPaymentNo)
  if (!payment) {
    throw new DomainError(404, 'Unknown provider payment reference')
  }
  const order = await findOrderById(db, payment.orderId)
  if (!order) throw new DomainError(404, 'Payment order missing')

  // Amount tamper check — the callback amount must match the stored order.
  if (event.amountFen != null && event.amountFen !== order.totalFen) {
    await transitionPayment(db, payment.id, 'pending', 'failed')
    throw new DomainError(400, 'Payment amount mismatch')
  }

  if (event.status === 'paid') {
    await db.transaction(async (tx) => {
      const paymentPaid = await transitionPayment(tx, payment.id, 'pending', 'paid')
      if (!paymentPaid) return // concurrent callback won the race — idempotent skip

      // 渠道回执要素落库（支付宝 trade_no / 事件类型），后台支付订单页直接展示真实交易号
      await annotatePaymentPayload(tx, payment.id, {
        providerTradeNo: event.eventId,
        eventType: event.eventType,
      })
      const orderPaid = await markOrderPaidInTx(tx, order.id)
      if (orderPaid) {
        await confirmIfSubmitted(tx, order.registrationId)
        // 缴费到账即会员：与确认注册、发放凭证同一事务（支付宝/微信/mock 回调与对公审核殊途同归）
        await markRegistrationMember(tx, order.registrationId)
        await ensureCredential(tx, order.registrationId)
      }
    })
    return { duplicate: false as const, status: 'paid' as const }
  }

  if (event.status === 'failed') {
    await transitionPayment(db, payment.id, 'pending', 'failed')
    await transitionOrder(db, order.id, 'pending', 'failed')
    return { duplicate: false as const, status: 'failed' as const }
  }

  if (event.status === 'expired') {
    await transitionPayment(db, payment.id, 'pending', 'expired')
    await transitionOrder(db, order.id, 'pending', 'expired')
    return { duplicate: false as const, status: 'expired' as const }
  }

  return { duplicate: false as const, status: payment.status }
}

export async function getPaymentView(db: Db, paymentId: string): Promise<PaymentView | null> {
  const payment = await findPaymentById(db, paymentId)
  if (!payment) return null
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    status: payment.status,
    amountFen: payment.amountFen,
    currency: payment.currency,
    payload: (payment.payload as Record<string, unknown>) ?? null,
  }
}

/**
 * 主动对账：webhook 丢失（自签名 https 回调不可达、网络抖动等）时，
 * 由订单页轮询触发向支付渠道主动查单（alipay.trade.query 等）。
 * 结果走与真实回调完全相同的 handlePaymentCallback —— 幂等键
 * `${provider}-query-${providerPaymentNo}` 与真实回调（trade_no）不同，
 * 但状态迁移有 `WHERE status='pending'` 守卫，两边谁先到谁生效，重复安全。
 */
export async function reconcilePendingPayment(db: Db, paymentId: string, mockSecret: string) {
  const payment = await findPaymentById(db, paymentId)
  if (!payment || payment.status !== 'pending') {
    return { status: payment?.status ?? 'unknown', acted: false as const }
  }
  const order = await findOrderById(db, payment.orderId)
  if (!order || order.status !== 'pending') {
    return { status: 'pending', acted: false as const }
  }

  let remote: ProviderPaymentStatus
  try {
    const provider = getPaymentProvider(payment.provider, { mockPaymentSecret: mockSecret })
    remote = await provider.queryPayment(payment.providerPaymentNo)
  }
  catch {
    return { status: 'pending', acted: false as const } // 渠道未配置/网络失败 —— 保持现状
  }

  if (remote !== 'paid' && remote !== 'failed' && remote !== 'expired') {
    return { status: 'pending', acted: false as const }
  }

  const result = await handlePaymentCallback(db, payment.provider, {
    eventId: `${payment.provider}-query-${payment.providerPaymentNo}`,
    eventType: `${payment.provider}.query.${remote}`,
    providerPaymentNo: payment.providerPaymentNo,
    orderNo: order.orderNo,
    status: remote,
  })
  return { status: remote, acted: !result.duplicate }
}
