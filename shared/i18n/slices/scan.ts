import type { Locale } from '../core'

/**
 * 扫码核验端（/scan，工作人员现场签到工具）文案。
 * zh 的值 = 改造前页面上的原字符串（逐字保留，E2E 强断言：
 * 「凭证有效」「已签到」「未识别」「已撤销」「确认签到」「扫下一个」「登录」等）。
 * 页面原本为中英混排的工作端，zh 保留原有英文短语不动。
 */
export const scanMessages: Record<Locale, Record<string, unknown>> = {
  zh: {
    scan: {
      seoTitle: 'ISAGMSM · 签到核验端',
      seoDescription: 'ISAGMSM 现场签到核验端。',
      exit: '退出',
      checking: 'Checking session…',
      gate: {
        kicker: 'STAFF ACCESS REQUIRED',
        title: 'Check-in scanner',
        usernameLabel: 'Username',
        pwdLabel: 'Password',
        submitting: 'Signing in…',
        submit: '登录',
        loginFailed: 'Login failed.',
        devHint: 'Dev accounts — admin / pps26-admin · staff / pps26-staff',
      },
      camera: {
        starting: '正在启动摄像头…',
        unavailableDetail: '摄像头不可用 ({detail}). 请使用手动输入。',
        unavailable: '摄像头不可用. 请使用手动输入。',
      },
      manual: {
        label: 'Manual entry — registration ID or verification link',
        placeholder: 'e.g. https://…/verify/<token> or token',
        verify: 'Verify',
      },
      verdict: {
        valid: '凭证有效',
        checkedIn: '已签到',
        notRecognized: '未识别',
        unconfirmed: '未确认缴费',
        revoked: '已撤销',
        failed: '核验失败',
        invalidBody: '该二维码不是有效的 ISAGMSM 参会凭证。',
      },
      facts: {
        registration: 'Registration',
        type: 'Type',
        country: 'Country',
        checkedIn: '已签到',
      },
      actions: {
        confirming: 'Confirming…',
        confirm: '确认签到',
        scanNext: '扫下一个',
      },
      messages: {
        sessionExpired: 'Session expired — please sign in again.',
        verifyFailed: 'Verification failed. Check the code and retry.',
        duplicate: '重复签到（{time}）',
        checkinFailed: 'Check-in failed.',
      },
      log: {
        title: 'Recent (this device)',
        noteCheckedIn: 'checked in',
        noteDuplicate: 'duplicate',
        noteError: 'error',
      },
    },
  },
  en: {
    scan: {
      seoTitle: 'ISAGMSM · Check-in Verification',
      seoDescription: 'ISAGMSM on-site check-in verification console.',
      exit: 'Exit',
      checking: 'Checking session…',
      gate: {
        kicker: 'STAFF ACCESS REQUIRED',
        title: 'Check-in scanner',
        usernameLabel: 'Username',
        pwdLabel: 'Password',
        submitting: 'Signing in…',
        submit: 'Sign in',
        loginFailed: 'Login failed.',
        devHint: 'Dev accounts — admin / pps26-admin · staff / pps26-staff',
      },
      camera: {
        starting: 'Starting camera…',
        unavailableDetail: 'Camera unavailable ({detail}). Please use manual entry.',
        unavailable: 'Camera unavailable. Please use manual entry.',
      },
      manual: {
        label: 'Manual entry — registration ID or verification link',
        placeholder: 'e.g. https://…/verify/<token> or token',
        verify: 'Verify',
      },
      verdict: {
        valid: 'Credential valid',
        checkedIn: 'Checked in',
        notRecognized: 'Not recognized',
        unconfirmed: 'Payment not confirmed',
        revoked: 'Revoked',
        failed: 'Verification failed',
        invalidBody: 'This QR code is not a valid ISAGMSM 2027 participant credential.',
      },
      facts: {
        registration: 'Registration',
        type: 'Category',
        country: 'Country',
        checkedIn: 'Checked in',
      },
      actions: {
        confirming: 'Confirming…',
        confirm: 'Confirm check-in',
        scanNext: 'Scan next',
      },
      messages: {
        sessionExpired: 'Session expired — please sign in again.',
        verifyFailed: 'Verification failed. Check the code and retry.',
        duplicate: 'Already checked in at {time}.',
        checkinFailed: 'Check-in failed.',
      },
      log: {
        title: 'Recent (this device)',
        noteCheckedIn: 'checked in',
        noteDuplicate: 'duplicate',
        noteError: 'error',
      },
    },
  },
}
