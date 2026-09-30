import { createWriteStream } from 'node:fs'
import { mkdir, readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { DomainError } from '../utils/validation'

/**
 * 数据库备份服务（管理台专属）。
 *
 *  - 通过 `docker exec <container> pg_dump -Fc` 生成自定义格式转储（参数数组、
 *    无 shell、无用户输入参与命令 —— 仅允许触发，不允许注入）
 *  - 备份文件名由服务端时间戳生成；读取/删除仅接受严格白名单文件名
 *    （BACKUP_NAME_RE），并做 resolve 后的目录前缀校验 —— 杜绝路径穿越
 *  - 保留策略：每次备份后仅保留最新 BACKUP_KEEP 份
 *  - 定时：backup-scheduler 插件按 BACKUP_INTERVAL_HOURS 周期触发
 */

const NAME_RE = /^backup-\d{4}-\d{2}-\d{2}-\d{6}\.dump$/

export function backupDir(): string {
  // 相对路径按进程 cwd 解析：dev（cwd=admin/）→ admin/backups；
  // pm2 生产模式由 ecosystem 显式注入 BACKUP_DIR=admin/backups（cwd=仓库根）。
  return path.resolve(process.env.BACKUP_DIR ?? path.join(process.cwd(), 'backups'))
}

export function backupIntervalHours(): number {
  const n = Number(process.env.BACKUP_INTERVAL_HOURS ?? 24)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function backupKeep(): number {
  const n = Number(process.env.BACKUP_KEEP ?? 14)
  return Number.isFinite(n) && n > 0 ? n : 14
}

function dockerContainer(): string {
  return process.env.BACKUP_DOCKER_CONTAINER ?? 'pps-postgres'
}

/** 从 DATABASE_URL 解析 pg_dump 所需的 user / dbname（不使用密码 —— 容器内本地信任）。 */
function parseDatabaseUrl(url: string): { user: string, database: string } {
  try {
    const parsed = new URL(url)
    return {
      user: decodeURIComponent(parsed.username || 'postgres'),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    }
  }
  catch {
    return { user: 'postgres', database: 'postgres' }
  }
}

function timestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

export interface BackupFile {
  name: string
  sizeBytes: number
  createdAt: string
}

export async function listBackups(): Promise<BackupFile[]> {
  const dir = backupDir()
  let entries: string[]
  try {
    entries = await readdir(dir)
  }
  catch {
    return []
  }
  const files = []
  for (const name of entries) {
    if (!NAME_RE.test(name)) continue
    const info = await stat(path.join(dir, name))
    files.push({ name, sizeBytes: info.size, createdAt: info.mtime.toISOString() })
  }
  return files.sort((a, b) => b.name.localeCompare(a.name))
}

/** 白名单 + resolve 前缀校验 —— 路径穿越在此被拒绝。 */
export function resolveBackupPath(name: string): string {
  if (!NAME_RE.test(name)) {
    throw new DomainError(400, '非法的备份文件名')
  }
  const dir = backupDir()
  const resolved = path.resolve(dir, name)
  if (!resolved.startsWith(dir + path.sep)) {
    throw new DomainError(400, '非法的备份文件名')
  }
  return resolved
}

/** 运行 pg_dump 生成备份；返回文件名。 */
export async function createBackup(databaseUrl: string): Promise<string> {
  const dir = backupDir()
  await mkdir(dir, { recursive: true })

  const name = `backup-${timestamp()}.dump`
  const target = resolveBackupPath(name)
  const { user, database } = parseDatabaseUrl(databaseUrl)

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('docker', [
      'exec', dockerContainer(), 'pg_dump',
      '-U', user,
      '-d', database,
      '--no-owner',
      '--no-privileges',
      '-Fc',
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    const out = createWriteStream(target)
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    child.stdout.pipe(out)
    child.on('error', (err) => { out.destroy(); rejectPromise(err) })
    child.on('close', (code) => {
      out.end(() => {
        if (code === 0) resolvePromise()
        else rejectPromise(new DomainError(500, `备份失败（pg_dump 退出码 ${code}）：${stderr.slice(0, 300)}`))
      })
    })
  })

  await pruneOldBackups()
  return name
}

export async function deleteBackup(name: string): Promise<void> {
  const target = resolveBackupPath(name)
  await unlink(target).catch(() => {
    throw new DomainError(404, '备份不存在')
  })
}

async function pruneOldBackups(): Promise<void> {
  const keep = backupKeep()
  const files = await listBackups()
  for (const file of files.slice(keep)) {
    await unlink(path.join(backupDir(), file.name)).catch(() => {})
  }
}
