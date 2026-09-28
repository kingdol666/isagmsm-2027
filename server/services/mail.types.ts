export interface Mailer {
  sendVerificationCode(email: string, code: string, purpose: 'signup' | 'reset'): Promise<void>
}
