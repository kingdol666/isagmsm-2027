import type { Db, Tx } from '../db'
import { bumpCounter, formatOrderNo } from '../db/counters'
import { computePrice } from './pricing.service'
import { DomainError } from './registration.service'
import { findTypeById } from '../repositories/registration-types'
import { findRegistrationDetail } from '../repositories/registrations'
import { createOrder, findLatestOrderForRegistration, findOrderById, transitionOrder } from '../repositories/orders'
import { getSetting } from '../repositories/content'

/**
 * OrderService — order totals ALWAYS come from the registration type price
 * via computePrice(); nothing here ever trusts a client-provided amount.
 */
export async function createOrderForRegistration(db: Db, registrationId: string) {
  const detail = await findRegistrationDetail(db, registrationId)
  if (!detail) throw new DomainError(404, 'Registration not found')
  const { registration, type } = detail

  if (registration.status === 'confirmed') {
    throw new DomainError(409, 'Registration is already confirmed')
  }

  const existing = await findLatestOrderForRegistration(db, registrationId)
  if (existing && existing.status === 'pending') {
    return existing
  }
  if (existing && existing.status === 'paid') {
    throw new DomainError(409, 'A paid order already exists for this registration')
  }

  const earlyBirdDeadline = await getSetting<string>(db, 'early_bird_deadline') ?? undefined
  const breakdown = computePrice(
    { priceFen: type.priceFen, currency: type.currency },
    { earlyBirdDeadline },
  )

  const seq = await bumpCounter(db, 'order')
  return createOrder(db, {
    registrationId,
    orderNo: formatOrderNo(seq),
    subtotalFen: breakdown.subtotalFen,
    discountFen: breakdown.discountFen,
    totalFen: breakdown.totalFen,
    currency: breakdown.currency,
    discountReason: breakdown.discountReason,
    status: 'pending',
  })
}

export async function getOrder(db: Db, id: string) {
  return findOrderById(db, id)
}

/**
 * Marks the order paid inside the caller's transaction. Returns false when
 * the order was not in `pending` (already processed — callers skip ahead).
 */
export async function markOrderPaidInTx(tx: Tx, orderId: string): Promise<boolean> {
  const updated = await transitionOrder(tx, orderId, 'pending', 'paid')
  return updated !== null
}

export async function markOrder(db: Db, orderId: string, from: string, to: string) {
  return transitionOrder(db, orderId, from, to)
}

export async function getRegistrationType(db: Db, typeId: string) {
  return findTypeById(db, typeId)
}
