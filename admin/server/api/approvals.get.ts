import { listApprovalQueue } from '../repositories/console'

/** 缴费审批队列：待支付 + 审核中的订单（含转账流水号与提交时间）。 */
export default defineEventHandler(async () => {
  const db = useDb()
  return { rows: await listApprovalQueue(db) }
})
