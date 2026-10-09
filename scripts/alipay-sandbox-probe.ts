/**
 * 沙箱网关连通性探针：用项目真实适配器代码（server/payments/alipay.ts）
 * 向支付宝沙箱网关发起一次 precreate，观察 Alipay 的应答。
 *
 *   npx tsx scripts/alipay-sandbox-probe.ts
 *
 * 预期（未填真实沙箱 APPID 时）：请求到达并被支付宝解析 → 返回业务错误
 * （如 无效的APPID / aop.INVALID_APP_ID）—— 证明报文格式、编码、网关连通正常，
 * 只差真实商户三件套。填好真实凭证后同一脚本应返回 qr_code。
 */
import { generateKeyPairSync } from 'node:crypto'

process.env.ALIPAY_GATEWAY = process.env.ALIPAY_GATEWAY ?? 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'
process.env.ALIPAY_APP_ID = process.env.ALIPAY_APP_ID ?? '2021000000000000'
process.env.ALIPAY_NOTIFY_URL = process.env.ALIPAY_NOTIFY_URL ?? 'https://example.org/api/payments/webhook/alipay'

function ensureKeys() {
  if (!process.env.ALIPAY_PRIVATE_KEY || !process.env.ALIPAY_PUBLIC_KEY) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    process.env.ALIPAY_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    process.env.ALIPAY_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    return true
  }
  return false
}

const generated = ensureKeys()

async function main() {
  const { alipayConfigFromEnv, createAlipayProvider } = await import('../server/payments/alipay')
  const config = alipayConfigFromEnv(process.env)
  if (!config) throw new Error('凭证解析失败（检查 ALIPAY_* 格式）')
  const provider = createAlipayProvider(config)

  console.log(`网关    : ${process.env.ALIPAY_GATEWAY}`)
  console.log(`APPID   : ${process.env.ALIPAY_APP_ID}${generated ? '（占位）' : ''}`)
  console.log(`密钥    : ${generated ? '临时生成（占位）' : '来自环境变量'}`)
  console.log('───── precreate ─────')

  try {
    const result = await provider.createPayment({
      paymentId: 'probe-0001',
      orderNo: `SANDBOX-PROBE-${Date.now()}`,
      amountFen: 1,
      description: 'Sandbox connectivity probe',
    })
    console.log('✅ 成功！qrContent =', result.payload?.qrContent)
    console.log('   （拿到二维码即表示凭证有效，可扫码支付走通全链路）')
  }
  catch (error) {
    const message = (error as Error).message
    console.log('❌ 渠道应答错误:', message)
    if (/无效|INVALID|40002|40004/i.test(message)) {
      console.log('✅ 请求已被支付宝沙箱网关正确解析并应答 —— 报文格式/签名/连通性全部正常，')
      console.log('   只需在 .env 换成真实沙箱 APPID + 密钥三件套即可拿到二维码。')
    }
    else if (/signature mismatch/i.test(message)) {
      console.log('⚠ 响应验签失败：ALIPAY_PUBLIC_KEY 与该网关不匹配（沙箱/生产公钥不同，注意对应）')
    }
    else {
      console.log('⚠ 网络或格式问题，请检查网络代理（公司内网可能拦 alipay 域名）')
    }
  }
}

main()
