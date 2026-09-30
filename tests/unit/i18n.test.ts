import { describe, expect, it } from 'vitest'
import { messagePaths, resolveMessage } from '../../shared/i18n/core'
import { messages } from '../../shared/i18n'
import * as siteZh from '../../shared/content/site'
import * as siteEn from '../../shared/content/site-en'

/**
 * i18n 完整性：zh / en 两个字典必须逐键同构（切片文案 + 全站内容镜像）。
 * 结构漂移（漏键/多键/数组长度不一致）在这里直接失败，而不是线上显示路径。
 */

describe('UI message slices parity (zh vs en)', () => {
  it('every slice has identical key paths in zh and en', () => {
    const zhPaths = messagePaths(messages.zh).sort()
    const enPaths = messagePaths(messages.en).sort()
    expect(enPaths, 'en 缺少或多余的文案键').toEqual(zhPaths)
    expect(zhPaths.length).toBeGreaterThan(20)
  })

  it('en tree actually translates (not a copy of zh)', () => {
    // 防回归：合并逻辑若把 zh 串给 en（曾发生），这里立刻失败
    expect(messages.en.common.auth.signIn).not.toBe(messages.zh.common.auth.signIn)
    expect(messages.en.common.auth.signIn).toBe('Sign in')
    expect(messages.en.submit.done.success).not.toBe(messages.zh.submit.done.success)
    const zhPaths = messagePaths(messages.zh)
    const same = zhPaths.filter(p => resolveMessage(messages.zh, p) === resolveMessage(messages.en, p))
    // 允许极少数刻意双语文案（如 VALID/REVOKED、DEV MODE 行），但绝大多数值必须不同
    expect(same.length / zhPaths.length, `en 树中与 zh 相同的值占比过高：${same.slice(0, 8).join(', ')}`).toBeLessThan(0.2)
  })

  it('every leaf value is a non-empty string or array of strings', () => {
    const check = (dict: unknown, path: string) => {
      if (dict == null || typeof dict !== 'object') {
        expect(dict, `叶子 ${path} 应为非空字符串或字符串数组`).toBeTruthy()
        return
      }
      for (const [key, value] of Object.entries(dict as Record<string, unknown>)) {
        const p = `${path}.${key}`
        if (value != null && typeof value === 'object' && !Array.isArray(value)) {
          check(value, p)
        }
        else if (Array.isArray(value)) {
          expect(value.length, `数组 ${p} 不应为空`).toBeGreaterThan(0)
          for (const item of value) expect(typeof item, `数组 ${p} 元素应为字符串`).toBe('string')
        }
        else {
          expect(typeof value, `叶子 ${p} 应为字符串`).toBe('string')
          expect(value, `叶子 ${p} 不应为空`).not.toBe('')
        }
      }
    }
    check(messages.zh, 'zh')
    check(messages.en, 'en')
  })
})

describe('site content parity (site.ts vs site-en.ts)', () => {
  it('site-en mirrors every export of site with identical key structure', () => {
    const zhExports = Object.keys(siteZh).sort()
    const enExports = Object.keys(siteEn).sort()
    expect(enExports, 'site-en.ts 必须导出与 site.ts 完全同名的内容').toEqual(zhExports)

    const walk = (zh: unknown, en: unknown, path: string) => {
      if (zh == null || typeof zh !== 'object') {
        expect(typeof en, `内容 ${path} 类型应一致`).toBe(typeof zh)
        return
      }
      if (Array.isArray(zh)) {
        expect(Array.isArray(en), `内容 ${path} 应为数组`).toBe(true)
        expect((en as unknown[]).length, `数组 ${path} 长度应一致`).toBe(zh.length)
        zh.forEach((item, i) => walk(item, (en as unknown[])[i], `${path}[${i}]`))
        return
      }
      expect(en, `内容 ${path} 应为对象`).toBeTruthy()
      const zhKeys = Object.keys(zh as Record<string, unknown>).sort()
      const enKeys = Object.keys(en as Record<string, unknown>).sort()
      expect(enKeys, `对象 ${path} 的键应一致`).toEqual(zhKeys)
      for (const key of zhKeys) {
        walk((zh as Record<string, unknown>)[key], (en as Record<string, unknown>)[key], `${path}.${key}`)
      }
    }

    for (const name of zhExports) {
      walk(siteZh[name as keyof typeof siteZh], siteEn[name as keyof typeof siteEn], name)
    }
  })

  it('zh and en content are not identical (the mirror actually translates)', () => {
    expect(siteEn.siteMeta.dates).not.toBe(siteZh.siteMeta.dates)
    expect(siteEn.siteNav[0]!.label).not.toBe(siteZh.siteNav[0]!.label)
    expect(siteEn.themesContent.items[0]!.title).not.toBe(siteZh.themesContent.items[0]!.title)
  })
})
