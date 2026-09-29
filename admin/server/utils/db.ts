import { createDb, type Db } from '../db'

let handle: Db | null = null

/** 进程级单例数据库句柄（连接串来自 runtimeConfig.databaseUrl）。 */
export function useDb(): Db {
  if (!handle) {
    handle = createDb(useRuntimeConfig().databaseUrl)
  }
  return handle
}
