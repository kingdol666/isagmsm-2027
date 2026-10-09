import { createHmac } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createDb } from '../../server/db'
import { credentials, orders, payments, registrationTypes, registrations, siteSettings, users } from '../../server/db/schema'
import { submitRegistration, DomainError } from '../../server/services/registration.service'
import { createOrderForRegistration, markOrderPaidInTx } from '../../server/services/order.service'
import { createPaymentForOrder, handlePaymentCallback } from '../../server/services/payment.service'
import { verifyByToken, checkinByToken } from '../../server/services/checkin.service'
import { ensureCredential } from '../../server/services/credential.service'
import { listActiveTypes } from '../../server/repositories/registration-types'
import { expireStaleOrders, findOrderById } from '../../server/repositories/orders'
import { createMockProvider } from '../../server/payments/mock'

/**
 * Domain-chain integration tests against a dedicated test database
 * (DATABASE_URL_TEST, migrated via drizzle-kit). Covers: registration,
 * server-side pricing, guarded state transitions, webhook idempotency,
 * amount-tamper rejection, credential issuance, check-in duplicates.
 */

const DATABASE_URL = process.env.DATABASE_URL_TEST
  ?? 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026_test'
const SECRET = 'dev-only-mock-secret'

const db = createDb(DATABASE_URL)
const provider = createMockProvider(SECRET)

const runId = Date.now()

beforeAll(async () => {
  // seed registration types into the test db if missing
  const types = await listActiveTypes(db)
  if (types.length === 0) {
    await db.insert(registrationTypes).values([
      { code: 'student', name: 'Student', priceFen: 160000, description: 'Students', availability: 'available', sortOrder: 1 },
      { code: 'academic', name: 'Academic', priceFen: 240000, description: 'Academic', availability: 'available', sortOrder: 2 },
    ])
  }
  // pin the early-bird deadline to the past so full-price assertions hold
  // regardless of the wall clock (ISAGMSM 2027 early-bird runs to 2027-03-09)
  const pinned = await db.select().from(siteSettings).where(eq(siteSettings.key, 'early_bird_deadline'))
  if (pinned.length === 0) {
    await db.insert(siteSettings).values({ key: 'early_bird_deadline', value: '2020-01-01T00:00:00+08:00' })
  }
})

afterAll(async () => {
  await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
})

async function registerAndOrder(tag: string, member = true) {
  const types = await listActiveTypes(db)
  const academic = types.find(t => t.code === 'academic')!
  // registrations belong to signed-in accounts — create one per scenario
  const [user] = await db.insert(users).values({
    email: `test-${tag}-${runId}@example.test`,
    fullName: `Test ${tag}`,
    emailVerifiedAt: new Date(),
  }).returning()
  const registration = await submitRegistration(db, {
    typeId: academic.id,
    fullName: `Test ${tag}`,
    email: user.email,
    affiliation: 'Vitest University',
    country: 'China',
  }, { id: user.id, email: user.email, fullName: user.fullName })
  if (member) {
    // 会员-凭证绑定：默认走会员路径（非会员路径由专门用例覆盖）
    await db.update(registrations).set({ isMember: true }).where(eq(registrations.id, registration.id))
  }
  const order = await createOrderForRegistration(db, registration.id)
  return { registration, order, type: academic }
}

describe('domain chain (integration)', () => {
  it('prices the order server-side from the registration type', async () => {
    const { order, type } = await registerAndOrder('price')
    expect(order.subtotalFen).toBe(type.priceFen)
    expect(order.totalFen).toBe(type.priceFen)
    expect(order.status).toBe('pending')
  })

  it('reuses the pending order instead of duplicating', async () => {
    const { registration } = await registerAndOrder('dedupe')
    const first = await createOrderForRegistration(db, registration.id)
    const second = await createOrderForRegistration(db, registration.id)
    expect(second.id).toBe(first.id)
  })

  it('confirms atomically via callback and treats repeats as duplicates', async () => {
    const { registration, order } = await registerAndOrder('paid')
    const payment = await createPaymentForOrder(db, order.id, 'mock', SECRET)

    const body = JSON.stringify({
      eventId: `evt-${runId}-paid`,
      eventType: 'mock.paid',
      providerPaymentNo: payment.providerPaymentNo,
      orderNo: order.orderNo,
      result: 'paid',
      amountFen: order.totalFen,
    })
    const headers = { 'x-mock-signature': createHmac('sha256', SECRET).update(body).digest('hex') }
    const event = provider.verifyCallback(headers, body)
    expect(event).not.toBeNull()

    const firstResult = await handlePaymentCallback(db, 'mock', event!)
    expect(firstResult).toEqual({ duplicate: false, status: 'paid' })

    const secondResult = await handlePaymentCallback(db, 'mock', event!)
    expect(secondResult.duplicate).toBe(true)

    const stored = await findOrderById(db, order.id)
    expect(stored?.status).toBe('paid')

    const [paidReg] = await db.select().from(registrations).where(eq(registrations.id, registration.id))
    expect(paidReg?.status).toBe('confirmed')
    expect(paidReg?.isMember).toBe(true)

    const credential = await ensureCredential(db, registration.id)
    const again = await ensureCredential(db, registration.id)
    expect(again.id).toBe(credential.id)
  })

  it('rejects amount-tampered callbacks and keeps the order pending', async () => {
    const { order } = await registerAndOrder('tamper')
    const payment = await createPaymentForOrder(db, order.id, 'mock', SECRET)

    const body = JSON.stringify({
      eventId: `evt-${runId}-tamper`,
      providerPaymentNo: payment.providerPaymentNo,
      orderNo: order.orderNo,
      result: 'paid',
      amountFen: 1,
    })
    const headers = { 'x-mock-signature': createHmac('sha256', SECRET).update(body).digest('hex') }
    const event = provider.verifyCallback(headers, body)
    expect(event).not.toBeNull()

    await expect(handlePaymentCallback(db, 'mock', event!)).rejects.toThrow('amount mismatch')
    const stored = await findOrderById(db, order.id)
    expect(stored?.status).toBe('pending')
  })

  it('marks the order paid exactly once under guarded transitions', async () => {
    const { order } = await registerAndOrder('guard')
    const first = await markOrderPaidInTx(db, order.id)
    const second = await markOrderPaidInTx(db, order.id)
    expect(first).toBe(true)
    expect(second).toBe(false)
  })

  it('credential verifies, check-in succeeds once and reports duplicates after', async () => {
    const { registration } = await registerAndOrder('checkin')
    const order = await createOrderForRegistration(db, registration.id)
    const payment = await createPaymentForOrder(db, order.id, 'mock', SECRET)

    const body = JSON.stringify({
      eventId: `evt-${runId}-checkin`,
      providerPaymentNo: payment.providerPaymentNo,
      orderNo: order.orderNo,
      result: 'paid',
      amountFen: order.totalFen,
    })
    await handlePaymentCallback(db, 'mock', provider.verifyCallback(
      { 'x-mock-signature': createHmac('sha256', SECRET).update(body).digest('hex') },
      body,
    )!)

    const credential = await ensureCredential(db, registration.id)

    const before = await verifyByToken(db, credential.token)
    expect(before.valid).toBe(true)
    expect(before.checkedInAt).toBeNull()

    const first = await checkinByToken(db, credential.token, 'scan')
    expect(first.duplicate).toBe(false)

    const second = await checkinByToken(db, credential.token, 'scan')
    expect(second.duplicate).toBe(true)
    expect(second.checkedInAt).toBe(first.checkedInAt)

    const after = await verifyByToken(db, credential.token)
    expect(after.checkedInAt).not.toBeNull()
  })

  it('token verification rejects unknown tokens', async () => {
    const result = await verifyByToken(db, `no-such-token-${runId}-${'x'.repeat(40)}`)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('not_found')
  })

  it('paying grants membership and issues the credential in the same transaction', async () => {
    // 新规则（缴费到账即会员）：支付成功 → 订单已支付 + 报名确认 + 自动入会 + 签发凭证
    const { registration, order } = await registerAndOrder('nonmember', false)
    const payment = await createPaymentForOrder(db, order.id, 'mock', SECRET)

    const body = JSON.stringify({
      eventId: `evt-${runId}-nonmember`,
      providerPaymentNo: payment.providerPaymentNo,
      orderNo: order.orderNo,
      result: 'paid',
      amountFen: order.totalFen,
    })
    const result = await handlePaymentCallback(db, 'mock', provider.verifyCallback(
      { 'x-mock-signature': createHmac('sha256', SECRET).update(body).digest('hex') },
      body,
    )!)
    expect(result).toEqual({ duplicate: false, status: 'paid' })

    const stored = await findOrderById(db, order.id)
    expect(stored?.status).toBe('paid')

    const [regRow] = await db.select().from(registrations).where(eq(registrations.id, registration.id))
    expect(regRow?.status).toBe('confirmed')
    expect(regRow?.isMember).toBe(true)

    const issued = await db.select().from(credentials).where(eq(credentials.registrationId, registration.id))
    expect(issued).toHaveLength(1)
  })

  it('expires stale pending orders and their payments after the TTL (lazy, read-time)', async () => {
    const prev = process.env.ORDER_TTL_MINUTES
    process.env.ORDER_TTL_MINUTES = '15'
    try {
      const { order } = await registerAndOrder('ttl')
      const payment = await createPaymentForOrder(db, order.id, 'mock', SECRET)

      // 未超时：惰性过期不影响 pending 订单
      expect(await expireStaleOrders(db)).toBeGreaterThanOrEqual(0)
      expect((await findOrderById(db, order.id))?.status).toBe('pending')

      // 回拨创建时间 16 分钟 → 再读取即过期（订单 + 支付一并 expired）
      await db.update(orders)
        .set({ createdAt: new Date(Date.now() - 16 * 60_000) })
        .where(eq(orders.id, order.id))
      await expireStaleOrders(db)

      expect((await findOrderById(db, order.id))?.status).toBe('expired')
      const [payRow] = await db.select().from(payments).where(eq(payments.id, payment.id))
      expect(payRow?.status).toBe('expired')

      // 过期订单不能再发起支付（必须新建订单）
      await expect(createPaymentForOrder(db, order.id, 'mock', SECRET))
        .rejects.toThrow('no payment can be created')

      // 过期订单不能再支付 → 但允许为该报名新建订单
      const renewed = await createOrderForRegistration(db, order.registrationId)
      expect(renewed.id).not.toBe(order.id)
      expect(renewed.status).toBe('pending')
    }
    finally {
      if (prev === undefined) delete process.env.ORDER_TTL_MINUTES
      else process.env.ORDER_TTL_MINUTES = prev
    }
  })

  it('blocks duplicate registration for an account that already has an active one', async () => {
    const { registration } = await registerAndOrder('dup')
    const [regRow] = await db.select().from(registrations).where(eq(registrations.id, registration.id))
    const dupUser = { id: regRow!.userId, email: `dup-${runId}@example.test`, fullName: 'Dup User' }
    const types = await listActiveTypes(db)
    const academic = types.find(t => t.code === 'academic')!
    await expect(submitRegistration(db, {
      typeId: academic.id,
      fullName: 'Dup User',
      email: dupUser.email,
      affiliation: 'Vitest University',
      country: 'China',
    }, dupUser))
      .rejects.toThrow('已有有效报名')

    // 已确认（已入会）同样拦截
    await db.update(registrations).set({ status: 'confirmed' }).where(eq(registrations.id, registration.id))
    await expect(submitRegistration(db, {
      typeId: academic.id,
      fullName: 'Dup User',
      email: dupUser.email,
      affiliation: 'Vitest University',
      country: 'China',
    }, dupUser))
      .rejects.toBeInstanceOf(DomainError)
  })
})
