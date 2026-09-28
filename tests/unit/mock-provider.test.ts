import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createMockProvider } from '../../server/payments/mock'

const SECRET = 'test-secret'

function signed(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload)
  return {
    body,
    headers: { 'x-mock-signature': createHmac('sha256', SECRET).update(body).digest('hex') },
  }
}

describe('MockPaymentProvider.verifyCallback', () => {
  const provider = createMockProvider(SECRET)

  it('accepts a correctly signed paid event', () => {
    const { body, headers } = signed({
      eventId: 'evt-1',
      providerPaymentNo: 'MOCK-1',
      orderNo: 'PPS26-ORD-1',
      result: 'paid',
      amountFen: 100,
    })
    const event = provider.verifyCallback(headers, body)
    expect(event).not.toBeNull()
    expect(event!.status).toBe('paid')
    expect(event!.orderNo).toBe('PPS26-ORD-1')
  })

  it('rejects a wrong signature', () => {
    const { body } = signed({ eventId: 'evt-2', providerPaymentNo: 'MOCK-1', result: 'paid' })
    expect(provider.verifyCallback({ 'x-mock-signature': 'nope' }, body)).toBeNull()
    expect(provider.verifyCallback({}, body)).toBeNull()
  })

  it('rejects tampered bodies (signature no longer matches)', () => {
    const { body, headers } = signed({ eventId: 'evt-3', providerPaymentNo: 'MOCK-1', result: 'paid' })
    const tampered = body.replace('"paid"', '"failed"')
    expect(provider.verifyCallback(headers, tampered)).toBeNull()
  })

  it('rejects unknown results', () => {
    const { body, headers } = signed({ eventId: 'evt-4', providerPaymentNo: 'MOCK-1', result: 'surprise' })
    expect(provider.verifyCallback(headers, body)).toBeNull()
  })

  it('rejects malformed JSON', () => {
    const body = '{not json'
    const headers = { 'x-mock-signature': createHmac('sha256', SECRET).update(body).digest('hex') }
    expect(provider.verifyCallback(headers, body)).toBeNull()
  })
})
