import { createMockProvider } from './mock'
import { wechatConfigFromEnv, createWechatProvider } from './wechat'
import { alipayConfigFromEnv, createAlipayProvider } from './alipay'
import type { PaymentProvider, PaymentProviderName } from './types'

export * from './types'

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Payment provider "${provider}" is not configured (missing credentials)`)
  }
}

function tryWechat(): PaymentProvider | null {
  const config = wechatConfigFromEnv(process.env)
  return config ? createWechatProvider(config) : null
}

function tryAlipay(): PaymentProvider | null {
  const config = alipayConfigFromEnv(process.env)
  return config ? createAlipayProvider(config) : null
}

/**
 * Provider registry. Mock is always available (dev/demo); WeChat Pay and
 * Alipay activate only when their credentials are present in the environment.
 * Requesting an unconfigured provider fails loudly — never a silent fallback.
 */
export function getPaymentProvider(name: string, config: { mockPaymentSecret: string }): PaymentProvider {
  switch (name) {
    case 'mock':
      return createMockProvider(config.mockPaymentSecret)
    case 'wechat': {
      const provider = tryWechat()
      if (!provider) throw new ProviderNotConfiguredError('wechat')
      return provider
    }
    case 'alipay': {
      const provider = tryAlipay()
      if (!provider) throw new ProviderNotConfiguredError('alipay')
      return provider
    }
    default:
      throw new ProviderNotConfiguredError(name)
  }
}

export function listAvailableProviders(): Array<{ name: PaymentProviderName, label: string, available: boolean }> {
  return [
    { name: 'mock', label: 'Mock Pay', available: true },
    { name: 'wechat', label: 'WeChat Pay', available: tryWechat() !== null },
    { name: 'alipay', label: 'Alipay', available: tryAlipay() !== null },
  ]
}
