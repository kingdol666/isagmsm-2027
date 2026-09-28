import { randomUUID } from 'node:crypto'
import type { Db } from '../db'
import { DomainError } from './registration.service'
import { getPaymentProvider } from '../payments'
import type { ProviderCallbackEvent } from '../payments'
import { createPayment, findPaymentByProviderNo, findPaymentById, recordPaymentEvent, transitionPayment } from '../repositories/payments'
import { findOrderById, transitionOrder } from '../repositories/orders'
import { confirmIfSubmitted } from '../repositories/registrations'
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

  const provider = getPaymentProvider(providerName, { mockPaymentSecret: mockSecret })
  const paymentId = randomUUID()
  const result = await provider.createPayment({
    paymentId,
    orderNo: order.orderNo,
    amountFen: order.totalFen,
    description: `PPS 2026 registration ${order.orderNo}`,
  })

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

      const orderPaid = await markOrderPaidInTx(tx, order.id)
      if (orderPaid) {
        await confirmIfSubmitted(tx, order.registrationId)
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
