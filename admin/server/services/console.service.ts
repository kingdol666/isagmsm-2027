import type { Db } from '../db'
import { registrations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { generateCredentialToken } from './crypto'
import { DomainError } from '../utils/validation'
import {
  confirmIfSubmitted,
  findAbstractById,
  findAbstractOwner,
  findCredentialByRegistration,
  findOrderWithParticipant,
  findRegistrationForOrder,
  insertAbstractEvent,
  insertCredential,
  listAbstractEvents,
  revokeActiveCredentials,
  setAbstractStatus,
  setCredentialStatus,
  setMembership,
  setOrderReview,
  transitionOrder,
} from '../repositories/console'
import type { ConsoleMailer } from './mail.service'

/**
 * 管理台领域服务。
 *
 * 会员-凭证绑定规则（本服务的核心不变量）：
 *   1. 凭证只发给会员 —— 收款确认/下发凭证前必须 isMember=true；
 *   2. 取消会员 = 自动吊销 —— 同一事务内摘掉会员标识并吊销全部 active 凭证，
 *      已发放的 QR/凭证立即失效（扫码端按凭证状态实时判定）；
 *   3. 只有 admin 角色可以执行入会/取消（API 层 requireConsoleAdmin 保证）。
 */

export interface ConsoleActor {
  userId: string
  username: string
}

/* ---------- 会员开关（含取消联动吊销） ---------- */

export async function setMembershipWithBinding(db: Db, registrationId: string, isMember: boolean) {
  if (isMember) {
    const updated = await setMembership(db, registrationId, true)
    if (!updated) throw new DomainError(404, '报名记录不存在')
    return { isMember: true, revokedCredentials: 0 }
  }

  let revoked = 0
  await db.transaction(async (tx) => {
    const updated = await setMembership(tx, registrationId, false)
    if (!updated) throw new DomainError(404, '报名记录不存在')
    revoked = await revokeActiveCredentials(tx, registrationId)
  })
  return { isMember: false, revokedCredentials: revoked }
}

/* ---------- 缴费审批 ---------- */

export async function approveOrderPayment(db: Db, orderId: string, actor: ConsoleActor) {
  const found = await findOrderWithParticipant(db, orderId)
  if (!found) throw new DomainError(404, '订单不存在')
  if (!['pending', 'reviewing'].includes(found.order.status)) {
    throw new DomainError(409, `订单当前状态为 ${found.order.status}，无法审批通过`)
  }

  const reg = await findRegistrationForOrder(db, orderId)
  if (!reg) throw new DomainError(404, '报名记录不存在')

  let credentialToken: string | null = null
  await db.transaction(async (tx) => {
    const paid = await transitionOrder(tx, orderId, found.order.status, 'paid')
    if (!paid) return // 并发审批竞争失败 — 幂等跳过

    await setOrderReview(tx, orderId, { reviewedBy: actor.userId, reviewedAt: new Date() })
    await confirmIfSubmitted(tx, found.registrationId)

    // 会员门槛：非会员只完成缴费确认，不发凭证；设为会员后由管理员手动下发。
    if (reg.isMember) {
      const existing = await findCredentialByRegistration(tx, found.registrationId)
      credentialToken = existing
        ? existing.token
        : (await insertCredential(tx, { registrationId: found.registrationId, token: generateCredentialToken() })).token
    }
  })

  return { status: 'paid' as const, credentialToken, isMember: reg.isMember }
}

export async function rejectOrderPayment(db: Db, orderId: string, actor: ConsoleActor, note: string) {
  const found = await findOrderWithParticipant(db, orderId)
  if (!found) throw new DomainError(404, '订单不存在')
  if (found.order.status !== 'reviewing') {
    throw new DomainError(409, `订单当前状态为 ${found.order.status}，无法驳回`)
  }

  await transitionOrder(db, orderId, 'reviewing', 'pending')
  await setOrderReview(db, orderId, {
    reviewedBy: actor.userId,
    reviewedAt: new Date(),
    reviewNote: note || null,
  })
  return { status: 'pending' as const }
}

/* ---------- 凭证管理 ---------- */

export async function issueCredentialForMember(db: Db, registrationId: string) {
  const existing = await findCredentialByRegistration(db, registrationId)
  if (existing) {
    if (existing.status !== 'active') {
      return await setCredentialStatus(db, existing.id, 'active')
    }
    return existing
  }
  return await insertCredential(db, { registrationId, token: generateCredentialToken() })
}

export async function manageCredential(db: Db, registrationId: string, action: 'issue' | 'revoke' | 'restore') {
  const existing = await findCredentialByRegistration(db, registrationId)

  if (action === 'issue') {
    // 会员门槛：非会员不允许获得凭证。
    const reg = await findRegistrationMemberFlag(db, registrationId)
    if (!reg) throw new DomainError(404, '报名记录不存在')
    if (!reg.isMember) {
      throw new DomainError(409, '仅会员可下发凭证：请先将该参会人设为会员')
    }
    return await issueCredentialForMember(db, registrationId)
  }

  if (!existing) throw new DomainError(404, '该报名暂无凭证')
  return await setCredentialStatus(db, existing.id, action === 'revoke' ? 'revoked' : 'active')
}

async function findRegistrationMemberFlag(db: Db, registrationId: string) {
  const rows = await db
    .select({ id: registrations.id, isMember: registrations.isMember, status: registrations.status })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1)
  return rows[0] ?? null
}

/* ---------- 稿件审稿 ---------- */

export async function reviewAbstract(
  db: Db,
  abstractId: string,
  reviewerName: string,
  input: { action: 'accept' | 'return', comment: string },
  mailer: ConsoleMailer,
) {
  const abstract = await findAbstractById(db, abstractId)
  if (!abstract) throw new DomainError(404, '稿件不存在')
  if (abstract.status !== 'submitted') throw new DomainError(409, '该稿件当前状态不可审稿（已审结或待重投）')

  const action = input.action === 'accept' ? 'accepted' : 'returned'
  const comment = input.comment.trim()
  const updated = await setAbstractStatus(db, abstractId, action)
  if (!updated) throw new DomainError(404, '稿件不存在')

  await insertAbstractEvent(db, {
    abstractId,
    kind: action,
    comment,
    actor: `admin:${reviewerName}`,
  })

  const owner = await findAbstractOwner(db, abstractId)
  if (owner) {
    try {
      await mailer.sendAbstractDecision({
        email: owner.email,
        displayName: abstract.submitterName || owner.fullName || owner.email,
        title: abstract.title,
        action,
        comment,
        version: abstract.version,
      })
    }
    catch (error) {
      console.error(`[console] decision mail failed for ${owner.email}:`, error)
    }
  }

  return { ...abstract, status: action }
}

export async function getAbstractTimeline(db: Db, abstractId: string) {
  if (!(await findAbstractById(db, abstractId))) throw new DomainError(404, '稿件不存在')
  return listAbstractEvents(db, abstractId)
}
