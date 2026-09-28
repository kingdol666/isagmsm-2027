export interface AbstractDecisionMail {
  email: string
  displayName: string
  title: string
  action: 'accepted' | 'returned'
  comment: string
  version: number
}

export interface Mailer {
  sendVerificationCode(email: string, code: string, purpose: 'signup' | 'reset'): Promise<void>
  /** 审稿结果通知：接收 / 返稿（含意见）。 */
  sendAbstractDecision(mail: AbstractDecisionMail): Promise<void>
}
