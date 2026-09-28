import { createHmac } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb } from '../../server/db'
import { registrationTypes } from '../../server/db/schema'
import { submitRegistration } from '../../server/services/registration.service'
import { createOrderForRegistration, markOrderPaidInTx } from '../../server/services/order.service'
import { createPaymentForOrder, handlePaymentCallback } from '../../server/services/payment.service'
import { verifyByToken, checkinByToken } from '../../server/services/checkin.service'
import { ensureCredential } from '../../server/services/credential.service'
import { listActiveTypes } from '../../server/repositories/registration-types'
import { findOrderById } from '../../server/repositories/orders'
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
})

afterAll(async () => {
  await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
})

async function registerAndOrder(tag: string) {
  const types = await listActiveTypes(db)
  const academic = types.find(t => t.code === 'academic')!
  const registration = await submitRegistration(db, {
    typeId: academic.id,
    fullName: `Test ${tag}`,
    email: `test-${tag}-${runId}@example.test`,
    affiliation: 'Vitest University',
    country: 'China',
  })
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
})
