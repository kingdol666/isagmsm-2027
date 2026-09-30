/**
 * 轻量 i18n 核心 — Locale 类型、文案合并、消息解析。
 * 文案按功能切片放在 slices/（每个切片同时含 zh 与 en，结构必须一致，
 * 由 tests/unit/i18n.test.ts 做逐键奇偶校验）。
 */

export type Locale = 'zh' | 'en'

export const LOCALES: Locale[] = ['zh', 'en']
export const DEFAULT_LOCALE: Locale = 'zh'
export const LOCALE_COOKIE = 'pps_locale'

/** 从嵌套字典按点路径取字符串，支持 {name} 插值；缺失时返回路径本身（便于发现漏键）。 */
export function resolveMessage(
  dict: unknown,
  path: string,
  params?: Record<string, string | number>,
): string {
  const value = path
    .split('.')
    .reduce<unknown>((node, key) => (isPlainNode(node) ? node[key] : undefined), dict)
  if (typeof value !== 'string') return path
  if (!params) return value
  return value.replace(/\{(\w+)\}/g, (whole, key: string) =>
    params[key] !== undefined ? String(params[key]) : whole,
  )
}

/** 从嵌套字典按点路径取字符串数组（如步骤名列表）；缺失时返回空数组。 */
export function resolveList(dict: unknown, path: string): string[] {
  const value = path
    .split('.')
    .reduce<unknown>((node, key) => (isPlainNode(node) ? node[key] : undefined), dict)
  return Array.isArray(value) ? value.map(item => String(item)) : []
}

function isPlainNode(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object'
}

/** 递归提取字典的全部叶子路径（i18n 奇偶校验测试用）。 */
export function messagePaths(dict: unknown, prefix = ''): string[] {
  if (dict == null || typeof dict !== 'object') return []
  const paths: string[] = []
  for (const [key, value] of Object.entries(dict as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...messagePaths(value, path))
    }
    else {
      paths.push(path)
    }
  }
  return paths
}
