import { backupIntervalHours, createBackup } from '../services/backup.service'

/**
 * 定时备份调度：BACKUP_INTERVAL_HOURS（默认 24，0 = 关闭）。
 * 启动后 30 秒做一次基线备份，之后按间隔周期执行；每次备份自动应用保留策略。
 */
export default defineNitroPlugin(() => {
  const hours = backupIntervalHours()
  if (hours <= 0) {
    console.warn('[backup] scheduled backups disabled (BACKUP_INTERVAL_HOURS=0)')
    return
  }

  const run = async (trigger: string) => {
    try {
      const config = useRuntimeConfig()
      const name = await createBackup(config.databaseUrl)
      console.warn(`[backup] ${trigger} backup completed: ${name}`)
    }
    catch (error) {
      console.error(`[backup] ${trigger} backup failed:`, error)
    }
  }

  setTimeout(() => { void run('boot') }, 30_000)
  setInterval(() => { void run('scheduled') }, hours * 3_600_000)
  console.warn(`[backup] scheduled every ${hours}h → ${process.env.BACKUP_DIR ?? 'backups/'}`)
})
