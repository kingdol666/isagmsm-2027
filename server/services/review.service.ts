import type { Db } from '../db'
import { DomainError } from './registration.service'
import { findOrderById, transitionOrder } from '../repositories/orders'
import { findUserOrder, setOrderReviewFields } from '../repositories/order-review'
import { confirmIfSubmitted } from '../repositories/registrations'
import { ensureCredential } from './credential.service'
import type { AdminSession } from '../utils/session'

/**
 * 对公转账审批流：参会人提交转账凭证（claim）→ 会务组核对银行记录 →
 * 审批通过后原子下发凭证（order paid + registration confirmed + credential）。
 */

export async function submitPaymentClaim(
  db: Db,
  orderId: string,
  userId: string,
  reference: string,
) {
  const order = await findUserOrder(db, orderId, userId)
  if (!order) throw new DomainError(404, 'Order not found')

  if (order.status === 'reviewing') {
    throw new DomainError(409, '该订单已在审核中，请耐心等待会务组核对')
  }
  if (order.status !== 'pending') {
    throw new DomainError(409, `当前订单状态为 ${order.status}，无法提交转账审核`)
  }

  const updated = await transitionOrder(db, orderId, 'pending', 'reviewing')
  if (!updated) throw new DomainError(409, '订单状态已变化，请刷新后重试')

  await setOrderReviewFields(db, orderId, {
    reference: reference || null,
    claimedAt: new Date(),
  })

  return { status: 'reviewing' as const }
}

/** 审批通过：单事务完成 order→paid、registration→confirmed、凭证下发。 */
export async function approveOrder(db: Db, orderId: string, admin: AdminSession) {
  const order = await findOrderById(db, orderId)
  if (!order) throw new DomainError(404, 'Order not found')
  if (!['pending', 'reviewing'].includes(order.status)) {
    throw new DomainError(409, `订单当前状态为 ${order.status}，无法审批通过`)
  }

  let credentialToken: string | null = null
  await db.transaction(async (tx) => {
    const paid = await transitionOrder(tx, orderId, order.status, 'paid')
    if (!paid) return // 并发审批竞争失败 — 幂等跳过

    await setOrderReviewFields(tx, orderId, {
      reviewedBy: admin.userId,
      reviewedAt: new Date(),
    })
    await confirmIfSubmitted(tx, order.registrationId)
    const credential = await ensureCredential(tx, order.registrationId)
    credentialToken = credential.token
  })

  return { status: 'paid' as const, credentialToken }
}

/** 驳回：订单退回待支付，参会人可补充信息后重新提交。 */
export async function rejectOrder(db: Db, orderId: string, admin: AdminSession, note: string) {
  const order = await findOrderById(db, orderId)
  if (!order) throw new DomainError(404, 'Order not found')
  if (order.status !== 'reviewing') {
    throw new DomainError(409, `订单当前状态为 ${order.status}，无法驳回`)
  }

  await transitionOrder(db, orderId, 'reviewing', 'pending')
  await setOrderReviewFields(db, orderId, {
    reviewedBy: admin.userId,
    reviewedAt: new Date(),
    reviewNote: note || null,
  })
  return { status: 'pending' as const }
}
