import { createSign, createVerify, createPrivateKey, createPublicKey, randomBytes, type KeyLike } from 'node:crypto'
import { orderTtlMinutes } from '../repositories/orders'
import type { CreatePaymentRequest, CreatePaymentResult, PaymentProvider, ProviderCallbackEvent, ProviderPaymentStatus } from './types'

/** Fixed allowlist — the server only ever talks to official Alipay endpoints. */
const ALLOWED_GATEWAY_HOSTS = new Set([
  'openapi.alipay.com',
  'openapi-sandbox.dl.alipaydev.com',
])

/** 二维码有效期与订单 TTL 一致（ORDER_TTL_MINUTES，默认 15 分钟）：
 *  超时后支付宝自动关单（notify TRADE_CLOSED），服务端惰性过期双保险。 */
function qrTimeoutExpress(): string {
  return `${orderTtlMinutes()}m`
}

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

/**
 * 开放平台密钥工具输出的是「裸 base64」（无 PEM 头尾与换行）；
 * 直接 createPrivateKey/createPublicKey 会解析失败。这里自动包上
 * PEM 头尾并按 64 列折行 —— 裸串与完整 PEM（\n 转义或真实换行）均支持。
 * 私钥兼容 PKCS#8（Java 版工具输出）与 PKCS#1（非 Java 版工具输出，默认），
 * 公钥兼容 X.509 SPKI 与 PKCS#1 两种格式。
 */
function normalizePem(raw: string, kind: 'PRIVATE KEY' | 'PUBLIC KEY'): string {
  const text = raw.replace(/\\n/g, '\n').trim()
  if (text.includes('-----BEGIN')) return text
  const body = text.replace(/\s/g, '')
  const lines = body.match(/.{1,64}/g) ?? []
  if (!lines.length) throw new Error(`empty ${kind}`)
  return `-----BEGIN ${kind}-----\n${lines.join('\n')}\n-----END ${kind}-----\n`
}

/** 依次尝试各 PEM 头标（PKCS8→PKCS1 私钥；SPKI→PKCS1 公钥），任一可解析即用。 */
function parsePemKey(raw: string, kind: 'private' | 'public') {
  const labels = kind === 'private'
    ? ['PRIVATE KEY', 'RSA PRIVATE KEY'] as const
    : ['PUBLIC KEY', 'RSA PUBLIC KEY'] as const
  let lastError: unknown
  for (const label of labels) {
    try {
      const pem = normalizePem(raw, label)
      return kind === 'private' ? createPrivateKey(pem) : createPublicKey(pem)
    }
    catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('key parse failed')
}

export interface AlipayConfig {
  appId: string
  privateKey: KeyLike // application private key (RSA2)
  alipayPublicKey: KeyLike // Alipay platform public key, verifies notify signatures
  notifyUrl: string
}

export function alipayConfigFromEnv(env: Record<string, string | undefined>): AlipayConfig | null {
  const appId = env.ALIPAY_APP_ID
  const privateKeyPem = env.ALIPAY_PRIVATE_KEY
  const publicKeyPem = env.ALIPAY_PUBLIC_KEY
  const notifyUrl = env.ALIPAY_NOTIFY_URL

  if (!appId || !privateKeyPem || !publicKeyPem || !notifyUrl) return null
  try {
    return {
      appId,
      privateKey: parsePemKey(privateKeyPem, 'private'),
      alipayPublicKey: parsePemKey(publicKeyPem, 'public'),
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

/** RSA2 verify over the sorted `key=value&…` blob (used by notify and query/reconcile paths). */
function verifySorted(params: Record<string, string>, signature: string, publicKey: KeyLike): boolean {
  const sorted = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&')
  return verifyBlob(sorted, signature, publicKey)
}

/** RSA2 verify over an exact blob (gateway response node). */
function verifyBlob(blob: string, signature: string, publicKey: KeyLike): boolean {
  try {
    return createVerify('RSA-SHA256').update(blob, 'utf8').verify(publicKey, signature, 'base64')
  }
  catch {
    return false
  }
}

/** Alipay notify params come urlencoded; values must be raw-decoded before verify. */
function parseNotify(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body))
}

/**
 * Alipay adapter — `alipay.trade.precreate` (QR, face-to-face style code),
 * async notify verification with the Alipay platform public key,
 * and `alipay.trade.query` for active reconciliation.
 */
export function createAlipayProvider(config: AlipayConfig): PaymentProvider {
  /**
   * 调用网关并验证响应签名：Alipay 对 `*_response` 节点整体签名（sign 在信封外），
   * 待验内容 = 原始响应文本里该节点的 JSON 子串（官方 SDK 同款做法）。
   */
  async function callGateway(method: string, bizContent: Record<string, unknown>): Promise<Record<string, unknown>> {
    const gateway = resolveGateway()
    const params: Record<string, string> = {
      app_id: config.appId,
      method,
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: formatAlipayTimestamp(new Date()),
      version: '1.0',
      biz_content: JSON.stringify(bizContent),
    }
    params.sign = signParams(params, config.privateKey)

    const response = await fetch(gateway, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    })
    if (!response.ok) throw new Error(`Alipay gateway ${response.status}`)
    const raw = await response.text()

    let json: Record<string, unknown>
    try {
      json = JSON.parse(raw) as Record<string, unknown>
    }
    catch {
      throw new Error(`Alipay gateway returned non-JSON (${method})`)
    }

    const sign = typeof json.sign === 'string' ? json.sign : ''
    const nodeKey = Object.keys(json).find(k => k.endsWith('_response'))
    if (!nodeKey) throw new Error(`Alipay gateway error (${method}): ${raw.slice(0, 200)}`)
    if (sign) {
      const nodeStart = raw.indexOf(`"${nodeKey}":`)
      const contentStart = raw.indexOf('{', nodeStart)
      const signIdx = raw.lastIndexOf(',"sign"')
      if (contentStart < 0 || signIdx <= contentStart) throw new Error(`Alipay response shape unexpected (${method})`)
      const signedContent = raw.slice(contentStart, signIdx)
      const ok = verifyBlob(signedContent, sign, config.alipayPublicKey)
      if (!ok) throw new Error(`Alipay response signature mismatch (${method})`)
    }

    return (json[nodeKey] as Record<string, unknown>) ?? {}
  }

  async function precreate(request: CreatePaymentRequest): Promise<string> {
    const resp = await callGateway('alipay.trade.precreate', {
      out_trade_no: request.orderNo,
      total_amount: (request.amountFen / 100).toFixed(2),
      subject: request.description.slice(0, 60),
      timeout_express: qrTimeoutExpress(),
    })
    const qr = (resp as { qr_code?: string, code?: string, msg?: string })
    if (!qr.qr_code) throw new Error(`Alipay precreate failed: ${qr.code ?? 'unknown'} ${qr.msg ?? ''}`)
    return qr.qr_code
  }

  return {
    name: 'alipay',

    async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
      const qrCode = await precreate(request)
      return {
        // out_trade_no（我方订单号）即后续 notify/query 的锚点 —— 必须与 verifyCallback
        // 返回的 providerPaymentNo 一致，否则回调按交易号找不到本地支付记录。
        providerPaymentNo: request.orderNo,
        payload: { qrContent: qrCode, mode: 'qrcode', timeoutExpress: qrTimeoutExpress() },
      }
    },

    verifyCallback(headers, rawBody): ProviderCallbackEvent | null {
      void headers
      const params = parseNotify(rawBody)
      const { sign, sign_type: signType, ...rest } = params
      if (!sign) return null
      if (signType !== 'RSA2') return null
      if (!verifySorted(rest, sign, config.alipayPublicKey)) return null

      const tradeStatus = params.trade_status
      const status: ProviderPaymentStatus | null = tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED'
        ? 'paid'
        : tradeStatus === 'TRADE_CLOSED' ? 'expired' : null
      if (!status) return null

      return {
        // trade_no 全局唯一且稳定 —— 作为幂等去重键；providerPaymentNo 用 out_trade_no 对齐本地记录
        eventId: params.trade_no ?? params.out_trade_no ?? randomBytes(8).toString('hex'),
        eventType: `alipay.${tradeStatus}`,
        providerPaymentNo: params.out_trade_no!,
        orderNo: params.out_trade_no,
        status,
        amountFen: params.total_amount ? Math.round(Number(params.total_amount) * 100) : undefined,
      }
    },

    /**
     * 主动查单（对账）：webhook 丢失时的兜底事实来源。
     * providerPaymentNo 存的是 out_trade_no —— alipay.trade.query 按此查询。
     */
    async queryPayment(providerPaymentNo: string): Promise<ProviderPaymentStatus> {
      let resp: Record<string, unknown>
      try {
        resp = await callGateway('alipay.trade.query', { out_trade_no: providerPaymentNo })
      }
      catch {
        return 'pending' // 查询失败不改变任何状态，等待下次轮询/回调
      }
      const code = String(resp.code ?? '')
      const tradeStatus = String(resp.trade_status ?? '')
      if (code === '10000') {
        if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') return 'paid'
        if (tradeStatus === 'TRADE_CLOSED') return 'expired'
        return 'pending' // WAIT_BUYER_PAY 等
      }
      // 40004 ACQ_TRADE_NOT_EXIST —— 用户从未扫码，视为 pending
      return 'pending'
    },
  }
}

function formatAlipayTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
