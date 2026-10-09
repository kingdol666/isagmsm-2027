import { describe, expect, it } from 'vitest'
import { createSign, generateKeyPairSync } from 'node:crypto'
import { alipayConfigFromEnv, createAlipayProvider } from '../../server/payments/alipay'

/**
 * 支付宝适配器离线测试：不访问网络。
 * 用本地 RSA 密钥对模拟「应用私钥 / 支付宝公钥」关系 —— 通知用"支付宝私钥"
 * 签名，适配器用"支付宝公钥"验签，与线上验签路径完全一致。
 */

const appKeys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const alipayKeys = generateKeyPairSync('rsa', { modulusLength: 2048 })

const ENV = {
  ALIPAY_APP_ID: '2021000000000000',
  ALIPAY_PRIVATE_KEY: appKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  ALIPAY_PUBLIC_KEY: alipayKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  ALIPAY_NOTIFY_URL: 'https://example.org/api/payments/webhook/alipay',
}

/** 按 Alipay 规则（排序 key=value&…，RSA2）用"支付宝私钥"签名通知体。 */
function signNotify(params: Record<string, string>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  return createSign('RSA-SHA256').update(sorted, 'utf8').sign(alipayKeys.privateKey, 'base64')
}

function buildRawBody(params: Record<string, string>, sign: string): string {
  return new URLSearchParams({ ...params, sign, sign_type: 'RSA2' }).toString()
}

const provider = createAlipayProvider(alipayConfigFromEnv(ENV)!)

describe('alipay adapter (offline)', () => {
  it('accepts bare base64 keys (open-platform key tool format) without PEM headers', () => {
    const barePrivate = appKeys.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64')
    const barePublic = alipayKeys.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
    const config = alipayConfigFromEnv({
      ...ENV,
      ALIPAY_PRIVATE_KEY: barePrivate,
      ALIPAY_PUBLIC_KEY: barePublic,
    })
    expect(config).not.toBeNull()
  })

  it('is inactive unless all four credentials are present', () => {
    expect(alipayConfigFromEnv({ ...ENV, ALIPAY_APP_ID: '' })).toBeNull()
    expect(alipayConfigFromEnv({ ...ENV, ALIPAY_PUBLIC_KEY: 'not-a-key' })).toBeNull()
  })

  it('verifies a signed TRADE_SUCCESS notify and anchors on out_trade_no', () => {
    const params = {
      app_id: ENV.ALIPAY_APP_ID,
      out_trade_no: 'ISAGMSM-ORD-000042',
      trade_no: '2026100922001400001234',
      trade_status: 'TRADE_SUCCESS',
      total_amount: '17.00',
      seller_id: '2088000000000000',
      gmt_create: '2026-10-09 10:00:00',
    }
    const event = provider.verifyCallback({}, buildRawBody(params, signNotify(params)))
    expect(event).not.toBeNull()
    expect(event!.status).toBe('paid')
    // 关键：锚定 out_trade_no（本地支付记录存的值），而非支付宝的 trade_no
    expect(event!.providerPaymentNo).toBe('ISAGMSM-ORD-000042')
    expect(event!.eventId).toBe('2026100922001400001234')
    expect(event!.amountFen).toBe(1700)
  })

  it('rejects tampered signatures, bodies and sign_types', () => {
    const params = {
      out_trade_no: 'ISAGMSM-ORD-000043',
      trade_no: '2026100922001400009999',
      trade_status: 'TRADE_SUCCESS',
      total_amount: '17.00',
    }
    const sign = signNotify(params)
    // 签名后篡改金额
    const tampered = { ...params, total_amount: '0.01' }
    expect(provider.verifyCallback({}, buildRawBody(tampered, sign))).toBeNull()
    // 无签名
    expect(provider.verifyCallback({}, new URLSearchParams(params).toString())).toBeNull()
    // 错误 sign_type
    expect(provider.verifyCallback({}, buildRawBody(params, sign).replace('sign_type=RSA2', 'sign_type=RSA'))).toBeNull()
  })

  it('maps TRADE_CLOSED to expired (QR timeout auto-close)', () => {
    const params = {
      out_trade_no: 'ISAGMSM-ORD-000044',
      trade_no: '2026100922001400008888',
      trade_status: 'TRADE_CLOSED',
      total_amount: '17.00',
    }
    const event = provider.verifyCallback({}, buildRawBody(params, signNotify(params)))
    expect(event?.status).toBe('expired')
  })

  it('queryPayment never throws offline — unresolvable gateway stays pending', async () => {
    const prev = process.env.ALIPAY_GATEWAY
    process.env.ALIPAY_GATEWAY = 'https://evil-not-alipay.example.com/gateway.do'
    try {
      const status = await provider.queryPayment('ISAGMSM-ORD-000045')
      expect(status).toBe('pending')
    }
    finally {
      if (prev === undefined) delete process.env.ALIPAY_GATEWAY
      else process.env.ALIPAY_GATEWAY = prev
    }
  })
})
