import { describe, expect, it } from 'vitest'
import { computePrice, EARLY_BIRD_DISCOUNT_RATE } from '../../server/services/pricing.service'

describe('computePrice (RegistrationPricingService)', () => {
  const input = { priceFen: 240000, currency: 'CNY' }

  it('charges full price after the early-bird deadline', () => {
    const result = computePrice(input, { now: new Date('2026-09-20T00:00:00+08:00') })
    expect(result.subtotalFen).toBe(240000)
    expect(result.discountFen).toBe(0)
    expect(result.totalFen).toBe(240000)
    expect(result.discountReason).toBeNull()
  })

  it('applies the early-bird discount before the deadline', () => {
    const result = computePrice(input, { now: new Date('2026-07-01T00:00:00+08:00') })
    expect(result.discountFen).toBe(Math.round(240000 * EARLY_BIRD_DISCOUNT_RATE))
    expect(result.totalFen).toBe(240000 - result.discountFen)
    expect(result.discountReason).toBe('early_bird')
  })

  it('deadline boundary: discount until end of deadline day', () => {
    const atDeadline = computePrice(input, { now: new Date('2026-08-01T23:59:59+08:00') })
    const afterDeadline = computePrice(input, { now: new Date('2026-08-02T00:00:00+08:00') })
    expect(atDeadline.discountReason).toBe('early_bird')
    expect(afterDeadline.discountReason).toBeNull()
  })

  it('free registrations never receive a discount', () => {
    const result = computePrice({ priceFen: 0, currency: 'CNY' }, { now: new Date('2026-06-01T00:00:00+08:00') })
    expect(result.totalFen).toBe(0)
    expect(result.discountFen).toBe(0)
    expect(result.discountReason).toBeNull()
  })

  it('rounds the discount to whole fen', () => {
    const result = computePrice({ priceFen: 160001, currency: 'CNY' }, { now: new Date('2026-06-01T00:00:00+08:00') })
    expect(Number.isInteger(result.discountFen)).toBe(true)
    expect(result.subtotalFen - result.discountFen).toBe(result.totalFen)
  })
})
