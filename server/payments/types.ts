/**
 * Payment provider contract. All payment integration code lives under
 * server/payments/ — services only ever talk to this interface.
 */

export type PaymentProviderName = 'mock' | 'wechat' | 'alipay'

export interface CreatePaymentRequest {
  paymentId: string
  orderNo: string
  amountFen: number
  description: string
}

export interface CreatePaymentResult {
  providerPaymentNo: string
  /** Provider-specific payload shown to the client (QR content, redirect URL…). */
  payload: Record<string, unknown>
}

export type ProviderPaymentStatus = 'pending' | 'paid' | 'failed' | 'expired'

export interface ProviderCallbackEvent {
  eventId: string
  eventType: string
  providerPaymentNo: string
  orderNo?: string
  status: ProviderPaymentStatus
  amountFen?: number
}

export interface PaymentProvider {
  readonly name: PaymentProviderName
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult>
  /**
   * Verify the callback signature over the RAW body. Returns the parsed event,
   * or null when the signature is invalid (caller must reject).
   */
  verifyCallback(headers: Record<string, string>, rawBody: string): ProviderCallbackEvent | null
  /** Active query — the other source of truth besides callbacks. */
  queryPayment(providerPaymentNo: string): Promise<ProviderPaymentStatus>
}
