import { backupIntervalHours, backupKeep, listBackups } from '../services/backup.service'

/** 备份列表（管理台专属）。 */
export default defineEventHandler(async () => {
  return {
    backups: await listBackups(),
    intervalHours: backupIntervalHours(),
    keep: backupKeep(),
  }
})
