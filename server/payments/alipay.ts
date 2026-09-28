import { createSign, createVerify, createPrivateKey, createPublicKey, randomBytes, type KeyLike } from 'node:crypto'
import type { CreatePaymentRequest, CreatePaymentResult, PaymentProvider, ProviderCallbackEvent, ProviderPaymentStatus } from './types'

/** Fixed allowlist — the server only ever talks to official Alipay endpoints. */
const ALLOWED_GATEWAY_HOSTS = new Set([
  'openapi.alipay.com',
  'openapi-sandbox.dl.alipaydev.com',
])

function resolveGateway(): string {
  const candidate = process.env.ALIPAY_GATEWAY ?? 'https://openapi.alipay.com/gateway.do'
  try {
    const url = new URL(candidate)
    if (url.protocol === 'https:' && ALLOWED_GATEWAY_HOSTS.has(url.hostname)) {
      return url.toString()
    }
  }
  catch { /* fall through */ }
  throw new Error('ALIPAY_GATEWAY must be an official https Alipay endpoint')
}

export interface AlipayConfig {
  appId: string
  privateKey: KeyLike // application private key (RSA2)
  alipayPublicKey: KeyLike // Alipay platform public key, verifies notify signatures
  notifyUrl: string
}

export function alipayConfigFromEnv(env: Record<string, string | undefined>): AlipayConfig | null {
  const appId = env.ALIPAY_APP_ID
  const privateKeyPem = env.ALIPAY_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const publicKeyPem = env.ALIPAY_PUBLIC_KEY?.replace(/\\n/g, '\n')
  const notifyUrl = env.ALIPAY_NOTIFY_URL

  if (!appId || !privateKeyPem || !publicKeyPem || !notifyUrl) return null
  try {
    return {
      appId,
      privateKey: createPrivateKey(privateKeyPem),
      alipayPublicKey: createPublicKey(publicKeyPem),
      notifyUrl,
    }
  }
  catch {
    return null
  }
}

/** RSA2 signature over the `key=value&…` blob with keys sorted (Alipay rule). */
function signParams(params: Record<string, string>, privateKey: KeyLike): string {
  const sorted = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&')
  return createSign('RSA-SHA256').update(sorted, 'utf8').sign(privateKey, 'base64')
}

/** Alipay notify params come urlencoded; values must be raw-decoded before verify. */
function parseNotify(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body))
}

/**
 * Alipay adapter — `alipay.trade.precreate` (QR, face-to-face style code),
 * async notify verification with the Alipay platform public key.
 */
export function createAlipayProvider(config: AlipayConfig): PaymentProvider {
  async function precreate(request: CreatePaymentRequest): Promise<string> {
    const gateway = resolveGateway()
    const bizContent = JSON.stringify({
      out_trade_no: request.orderNo,
      total_amount: (request.amountFen / 100).toFixed(2),
      subject: request.description.slice(0, 60),
    })
    const params: Record<string, string> = {
      app_id: config.appId,
      method: 'alipay.trade.precreate',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: formatAlipayTimestamp(new Date()),
      version: '1.0',
      notify_url: config.notifyUrl,
      biz_content: bizContent,
    }
    params.sign = signParams(params, config.privateKey)

    const response = await fetch(gateway, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    })
    if (!response.ok) throw new Error(`Alipay gateway ${response.status}`)
    const json = (await response.json()) as { alipay_trade_precreate_response?: { qr_code?: string, code?: string, msg?: string } }
    const qr = json.alipay_trade_precreate_response?.qr_code
    if (!qr) throw new Error(`Alipay precreate failed: ${json.alipay_trade_precreate_response?.code ?? 'unknown'}`)
    return qr
  }

  return {
    name: 'alipay',

    async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
      const qrCode = await precreate(request)
      return {
        providerPaymentNo: request.orderNo, // alipay notifies with out_trade_no + trade_no
        payload: { qrContent: qrCode, mode: 'qrcode' },
      }
    },

    verifyCallback(headers, rawBody): ProviderCallbackEvent | null {
      void headers
      const params = parseNotify(rawBody)
      const { sign, sign_type: signType, ...rest } = params
      if (!sign) return null
      if (signType !== 'RSA2') return null

      const message = Object.keys(rest).sort().map(key => `${key}=${rest[key]}`).join('&')
      try {
        const signatureOk = createVerify('RSA-SHA256').update(message, 'utf8').verify(config.alipayPublicKey, sign, 'base64')
        if (!signatureOk) return null
      }
      catch {
        return null
      }

      const tradeStatus = params.trade_status
      const status: ProviderPaymentStatus | null = tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED'
        ? 'paid'
        : tradeStatus === 'TRADE_CLOSED' ? 'failed' : null
      if (!status) return null

      return {
        eventId: params.trade_no ?? params.out_trade_no ?? randomBytes(8).toString('hex'),
        eventType: `alipay.${tradeStatus}`,
        providerPaymentNo: params.trade_no ?? params.out_trade_no!,
        orderNo: params.out_trade_no,
        status,
        amountFen: params.total_amount ? Math.round(Number(params.total_amount) * 100) : undefined,
      }
    },

    async queryPayment(providerPaymentNo: string): Promise<ProviderPaymentStatus> {
      // Active query endpoint — wired to alipay.trade.query when credentials
      // are live; until then the adapter reports pending (callback-driven).
      void providerPaymentNo
      return 'pending'
    },
  }
}

function formatAlipayTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
