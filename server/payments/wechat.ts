import { createDecipheriv, createSign, createVerify, createPrivateKey, createPublicKey, randomBytes, type KeyLike } from 'node:crypto'
import type { CreatePaymentRequest, CreatePaymentResult, PaymentProvider, ProviderCallbackEvent, ProviderPaymentStatus } from './types'

const GATEWAY = 'https://api.mch.weixin.qq.com'

export interface WechatConfig {
  mchId: string
  appId: string
  privateKey: KeyLike // merchant private key
  certSerial: string
  apiV3Key: string // 32-byte AES-GCM key
  /** Platform certificates (public keys) used to verify webhook signatures. */
  platformPublicKeys: KeyLike[]
}

export function wechatConfigFromEnv(env: Record<string, string | undefined>): WechatConfig | null {
  const mchId = env.WECHAT_MCH_ID
  const appId = env.WECHAT_APP_ID
  const privateKeyPem = env.WECHAT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const certSerial = env.WECHAT_CERT_SERIAL
  const apiV3Key = env.WECHAT_API_V3_KEY
  const platformPems = env.WECHAT_PLATFORM_CERTS?.split('---SPLIT---').map(p => p.replace(/\\n/g, '\n')) ?? []

  if (!mchId || !appId || !privateKeyPem || !certSerial || !apiV3Key || platformPems.length === 0) {
    return null
  }
  try {
    return {
      mchId,
      appId,
      privateKey: createPrivateKey(privateKeyPem),
      certSerial,
      apiV3Key,
      platformPublicKeys: platformPems.map(pem => createPublicKey(pem)),
    }
  }
  catch {
    return null
  }
}

/**
 * WeChat Pay v3 — Native (PC QR) adapter.
 *
 * Signature scheme: SHA256withRSA over `METHOD\nURL\ntimestamp\nnonce\nbody\n`,
 * Authorization header carries the merchant cert serial. Webhook signatures
 * are verified against platform public keys, then the resource is decrypted
 * with AES-256-GCM using the APIv3 key.
 */
export function createWechatProvider(config: WechatConfig): PaymentProvider {
  const privateKey = config.privateKey

  function authorizationHeader(method: string, urlPath: string, body: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = randomBytes(16).toString('hex')
    const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`
    const signature = createSign('RSA-SHA256').update(message).sign(privateKey, 'base64')
    return `WECHATPAY2-SHA256-With-RSA-Pattern mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.certSerial}"`
  }

  async function callApi(method: 'GET' | 'POST', urlPath: string, body: unknown): Promise<Record<string, unknown>> {
    const bodyText = body ? JSON.stringify(body) : ''
    const response = await fetch(`${GATEWAY}${urlPath}`, {
      method,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: authorizationHeader(method, urlPath, bodyText),
        'user-agent': 'pps2026-payment-adapter',
      },
      body: method === 'POST' ? bodyText : undefined,
    })
    if (!response.ok) {
      throw new Error(`WeChat Pay API ${response.status}: ${await response.text()}`)
    }
    return (await response.json()) as Record<string, unknown>
  }

  function decryptResource(resource: { nonce: string, associated_data?: string, ciphertext: string }): string {
    const key = Buffer.from(config.apiV3Key, 'utf8')
    const ciphertext = Buffer.from(resource.ciphertext, 'base64')
    const authTag = ciphertext.subarray(ciphertext.length - 16)
    const data = ciphertext.subarray(0, ciphertext.length - 16)
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(resource.nonce, 'utf8'))
    decipher.setAuthTag(authTag)
    decipher.setAAD(Buffer.from(resource.associated_data ?? 'transaction', 'utf8'))
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  }

  const STATE_MAP: Record<string, ProviderPaymentStatus> = {
    SUCCESS: 'paid',
    CLOSED: 'failed',
    REVOKED: 'failed',
    PAYERROR: 'failed',
    NOTPAY: 'pending',
    USERPAYING: 'pending',
    REFUND: 'failed',
  }

  return {
    name: 'wechat',

    async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
      const result = await callApi('POST', '/v3/pay/transactions/native', {
        mchid: config.mchId,
        appid: config.appId,
        description: request.description.slice(0, 127),
        out_trade_no: request.orderNo,
        notify_url: process.env.WECHAT_NOTIFY_URL ?? 'https://example.invalid/api/payments/webhook/wechat',
        amount: { total: request.amountFen, currency: 'CNY' },
      })
      const codeUrl = result.code_url as string | undefined
      if (!codeUrl) throw new Error('WeChat Pay: missing code_url in response')
      return {
        providerPaymentNo: request.orderNo, // wechat keys callbacks by out_trade_no until a transaction id exists
        payload: { qrContent: codeUrl, mode: 'native_qr' },
      }
    },

    verifyCallback(headers, rawBody): ProviderCallbackEvent | null {
      const timestamp = headers['wechatpay-timestamp']
      const nonce = headers['wechatpay-nonce']
      const signature = headers['wechatpay-signature']
      const serial = headers['wechatpay-serial']
      if (!timestamp || !nonce || !signature || !serial) return null

      const message = `${timestamp}\n${nonce}\n${rawBody}\n`
      const signatureOk = config.platformPublicKeys.some((publicKey) => {
        try {
          return createVerify('RSA-SHA256').update(message).verify(publicKey, signature, 'base64')
        }
        catch {
          return false
        }
      })
      if (!signatureOk) return null

      try {
        const parsed = JSON.parse(rawBody) as {
          event_type?: string
          resource?: { nonce: string, associated_data?: string, ciphertext: string }
        }
        if (!parsed.resource) return null
        const plain = JSON.parse(decryptResource(parsed.resource)) as {
          out_trade_no?: string
          transaction_id?: string
          trade_state?: string
          amount?: { total?: number }
        }
        if (!plain.out_trade_no || !plain.trade_state) return null
        return {
          eventId: plain.transaction_id ?? `${plain.out_trade_no}:${plain.trade_state}`,
          eventType: parsed.event_type ?? `wechat.${plain.trade_state}`,
          providerPaymentNo: plain.transaction_id ?? plain.out_trade_no,
          orderNo: plain.out_trade_no,
          status: STATE_MAP[plain.trade_state] ?? 'pending',
          amountFen: plain.amount?.total,
        }
      }
      catch {
        return null
      }
    },

    async queryPayment(providerPaymentNo: string): Promise<ProviderPaymentStatus> {
      const result = await callApi(
        'GET',
        `/v3/pay/transactions/out-trade-no/${encodeURIComponent(providerPaymentNo)}?mchid=${config.mchId}`,
        '',
      )
      const state = result.trade_state as string | undefined
      return state ? (STATE_MAP[state] ?? 'pending') : 'pending'
    },
  }
}
