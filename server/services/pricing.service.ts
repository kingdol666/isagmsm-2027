/**
 * RegistrationPricingService — THE single source of truth for prices.
 * The frontend never computes amounts; orders are always priced here,
 * server-side, from the registration_types table.
 */

export interface PriceInput {
  priceFen: number
  currency: string
}

export interface PriceBreakdown {
  subtotalFen: number
  discountFen: number
  totalFen: number
  currency: string
  discountReason: string | null
}

export interface PriceContext {
  now?: Date
  /** ISO date (YYYY-MM-DD) until which the early-bird discount applies. */
  earlyBirdDeadline?: string
}

export const EARLY_BIRD_DISCOUNT_RATE = 0.15
export const DEFAULT_EARLY_BIRD_DEADLINE = '2027-03-25T23:59:59+08:00'

export function computePrice(input: PriceInput, context: PriceContext = {}): PriceBreakdown {
  const subtotalFen = Math.max(0, Math.round(input.priceFen))
  const deadline = context.earlyBirdDeadline ?? DEFAULT_EARLY_BIRD_DEADLINE
  const isEarlyBird = (context.now ?? new Date()) <= new Date(deadline)

  const discountFen = isEarlyBird && subtotalFen > 0
    ? Math.round(subtotalFen * EARLY_BIRD_DISCOUNT_RATE)
    : 0

  return {
    subtotalFen,
    discountFen,
    totalFen: subtotalFen - discountFen,
    currency: input.currency,
    discountReason: discountFen > 0 ? 'early_bird' : null,
  }
}
