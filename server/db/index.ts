import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres'
import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import { Pool } from 'pg'
import * as schema from './schema'

const pools = new Map<string, Pool>()

export function getPool(databaseUrl: string): Pool {
  let pool = pools.get(databaseUrl)
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, max: 10 })
    pools.set(databaseUrl, pool)
  }
  return pool
}

/** Root database handle (owns the connection pool). */
export type Db = NodePgDatabase<typeof schema> & { $client: Pool }

/** A transaction — accepts the same query-building API as Db. */
export type Tx = PgTransaction<NodePgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>

/** Anything that can run queries: the root db or a transaction. */
export type DbExecutor = NodePgDatabase<typeof schema> | Tx

export type Database = Db

export function createDb(databaseUrl: string): Db {
  return drizzle(getPool(databaseUrl), { schema })
}

export { schema }
