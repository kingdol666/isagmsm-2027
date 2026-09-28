import { createMockProvider } from './mock'
import type { PaymentProvider, PaymentProviderName } from './types'

export * from './types'

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Payment provider "${provider}" is not configured (missing credentials)`)
  }
}

/**
 * Provider registry. wechat/alipay adapters register themselves once their
 * credentials are configured (see PAYMENT.md); unknown names and configured
 * credentials are rejected rather than silently falling back to mock.
 */
export function getPaymentProvider(name: string, config: { mockPaymentSecret: string, wechat?: Record<string, string>, alipay?: Record<string, string> }): PaymentProvider {
  switch (name) {
    case 'mock':
      return createMockProvider(config.mockPaymentSecret)
    case 'wechat':
    case 'alipay':
      // Real adapters land in Milestone 8; until credentials exist, refuse.
      throw new ProviderNotConfiguredError(name)
    default:
      throw new ProviderNotConfiguredError(name)
  }
}

export function listAvailableProviders(config: { wechatConfigured?: boolean, alipayConfigured?: boolean }): PaymentProviderName[] {
  const providers: PaymentProviderName[] = ['mock']
  if (config.wechatConfigured) providers.push('wechat')
  if (config.alipayConfigured) providers.push('alipay')
  return providers
}
