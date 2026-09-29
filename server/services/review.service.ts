import type { Db } from '../db'
import { DomainError } from './registration.service'
import { transitionOrder } from '../repositories/orders'
import { findUserOrder, setOrderReviewFields } from '../repositories/order-review'

/**
 * 对公转账 claim（参会人侧）：提交转账凭证 → 订单进入审核中。
 * 审批通过/驳回（管理台侧）在独立的 admin 项目中实现。
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
