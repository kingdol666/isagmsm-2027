import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres'
import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import { Pool } from 'pg'
import * as schema from './schema'

/**
 * 管理台数据库句柄 —— 与门户共用同一个 PostgreSQL 库（唯一数据通道）。
 * schema 定义是本进程自己的副本（只包含管理台需要的表）；门户拥有迁移。
 */

const pools = new Map<string, Pool>()

function getPool(databaseUrl: string): Pool {
  let pool = pools.get(databaseUrl)
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, max: 6 })
    pools.set(databaseUrl, pool)
  }
  return pool
}

export type Db = NodePgDatabase<typeof schema> & { $client: Pool }
export type Tx = PgTransaction<NodePgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>
export type DbExecutor = NodePgDatabase<typeof schema> | Tx

export function createDb(databaseUrl: string): Db {
  return drizzle(getPool(databaseUrl), { schema })
}

export function databaseUrlFromEnv(url: string | undefined): string {
  return url ?? 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026'
}

export { schema }
