import { listAllAbstracts } from '../repositories/console'

/** 全部稿件（含投稿人邮箱）。 */
export default defineEventHandler(async () => {
  const db = useDb()
  return { abstracts: await listAllAbstracts(db) }
})
