import { describe, expect, it } from 'vitest'
import { TrafficLimiter } from '../../server/utils/rate-limit'
import { buildSecurityHeaders } from '../../server/utils/security-headers'
import { buildConsoleSecurityHeaders } from '../../admin/server/utils/security-headers'
import { escapeLike } from '../../admin/server/repositories/console'
import { registerAccountSchema } from '../../shared/schemas/auth'
import { participantSchema } from '../../shared/schemas/registration'
import { submitAbstractSchema } from '../../shared/schemas/abstract'

/**
 * 安全加固回归：限流器、LIKE 转义、蜜罐字段、安全响应头。
 */

describe('TrafficLimiter（限流器）', () => {
  it('allows up to the limit then blocks with retry-after', () => {
    const limiter = new TrafficLimiter()
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('k', 5, 60_000).ok).toBe(true)
    }
    const blocked = limiter.allow('k', 5, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1)
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60)
  })

  it('keys are isolated per client', () => {
    const limiter = new TrafficLimiter()
    expect(limiter.allow('a', 1, 60_000).ok).toBe(true)
    expect(limiter.allow('a', 1, 60_000).ok).toBe(false)
    expect(limiter.allow('b', 1, 60_000).ok).toBe(true)
  })

  it('window expiry restores access', async () => {
    const limiter = new TrafficLimiter()
    expect(limiter.allow('w', 1, 10).ok).toBe(true)
    expect(limiter.allow('w', 1, 10).ok).toBe(false)
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(limiter.allow('w', 1, 10).ok).toBe(true)
  })
})

describe('escapeLike（LIKE 通配符转义）', () => {
  it('escapes % _ and backslash so search stays literal', () => {
    expect(escapeLike('100%_done')).toBe('100\\%\\_done')
    expect(escapeLike('a\\b')).toBe('a\\\\b')
    // 注入样例中的通配符必须全部带反斜杠转义（字面量匹配，不改变 LIKE 语义）
    expect(escapeLike("'; DROP TABLE users; --%_")).toBe("'; DROP TABLE users; --\\%\\_")
    // 不存在未转义的通配符
    expect(/(?<!\\)[%_]/.test(escapeLike('%_%'))).toBe(false)
  })
})

describe('蜜罐字段（反垃圾提交）', () => {
  const base = {
    email: 'honey@example.test',
    code: '123456',
    password: `Hp-${Date.now()}-Pass!`, // 测试夹具口令（动态生成，非真实凭据）
    fullName: '蜜罐测试',
  }

  it('rejects registration when the honeypot is filled', () => {
    expect(registerAccountSchema.safeParse({ ...base, website: 'http://spam.example' }).success).toBe(false)
    expect(registerAccountSchema.safeParse({ ...base, website: 'x' }).success).toBe(false)
  })

  it('accepts registration when the honeypot is absent or empty', () => {
    expect(registerAccountSchema.safeParse(base).success).toBe(true)
    expect(registerAccountSchema.safeParse({ ...base, website: '' }).success).toBe(true)
  })

  it('participant and abstract forms carry the same honeypot rule', () => {
    const participant = {
      typeId: '00000000-0000-0000-0000-000000000000',
      fullName: '蜜罐测试',
      email: 'honey@example.test',
      phone: '13800000000',
      affiliation: '凝胶大学',
      country: '中国',
      website: 'spam',
    }
    expect(participantSchema.safeParse(participant).success).toBe(false)

    const abstract = {
      title: '蜜罐测试稿件标题',
      topic: 'A' as const,
      reportType: 'oral' as const,
      abstractText: '这是一段足够长的摘要正文，用于满足最少三十个字符的校验要求，验证蜜罐字段。',
      submitterName: '蜜罐测试',
      submitterAffiliation: '凝胶大学',
      authors: [{ name: '蜜罐测试', affiliation: '凝胶大学' }],
      website: 'spam',
    }
    expect(submitAbstractSchema.safeParse(abstract).success).toBe(false)
  })
})

describe('安全响应头', () => {
  it('portal: base headers always present, CSP only when enabled', () => {
    const base = buildSecurityHeaders({ contentSecurityPolicy: false })
    expect(base['x-content-type-options']).toBe('nosniff')
    expect(base['x-frame-options']).toBe('DENY')
    expect(base['permissions-policy']).toContain('camera=(self)')
    expect(base['content-security-policy']).toBeUndefined()

    const withCsp = buildSecurityHeaders({ contentSecurityPolicy: true })
    expect(withCsp['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(withCsp['content-security-policy']).toContain('tile.openstreetmap.org')
    /* MapLibre v6 以 Blob URL 创建瓦片 worker——缺 blob: 会导致生产地图成片空白 */
    expect(withCsp['content-security-policy']).toContain("worker-src 'self' blob:")
  })

  it('console: no-store, camera denied, CSP with frame-ancestors none', () => {
    const base = buildConsoleSecurityHeaders({ contentSecurityPolicy: false })
    expect(base['cache-control']).toBe('no-store')
    expect(base['permissions-policy']).toContain('camera=()')
    expect(base['referrer-policy']).toBe('no-referrer')

    const withCsp = buildConsoleSecurityHeaders({ contentSecurityPolicy: true })
    expect(withCsp['content-security-policy']).toContain("frame-ancestors 'none'")
  })
})
