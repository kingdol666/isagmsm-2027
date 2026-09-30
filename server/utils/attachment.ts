import { randomBytes } from 'node:crypto'
import { DomainError } from '../services/registration.service'
import {
  ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  type AttachmentExtension,
} from '../../shared/schemas/abstract'

/**
 * 稿件附件校验 —— 不信任客户端提供的任何字段：
 * 扩展名白名单 + 魔数嗅探（内容与扩展名必须一致）+ 大小上限 + 文件名净化。
 * 客户端 contentType 仅作展示参考，存储类型由扩展名推导。
 */

const EXT_MIME: Record<AttachmentExtension, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export interface RawAttachment {
  fileName: string
  contentType?: string
  data: Buffer
}

export interface ValidatedAttachment {
  /** 净化后的展示文件名（不含路径） */
  fileName: string
  ext: AttachmentExtension
  /** 由扩展名推导的 MIME（用于下载响应头） */
  contentType: string
  size: number
  data: Buffer
}

/** 去路径、去控制字符、限长；空名兜底。 */
export function sanitizeFileName(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? ''
  const cleaned = Array.from(base)
    .filter(ch => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127)
    .join('')
    .trim()
  if (!cleaned || cleaned.startsWith('.')) return 'attachment'
  return cleaned.length > 180 ? cleaned.slice(-180) : cleaned
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

/** 魔数嗅探：pdf=%PDF，docx=PK\x03\x04，doc=OLE2 头。 */
export function sniffAttachmentType(data: Buffer): AttachmentExtension | null {
  if (data.length < 8) return null
  if (data.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf'
  if (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) return 'docx'
  // OLE2 Compound File（.doc）D0 CF 11 E0 A1 B1 1A E1
  if (data[0] === 0xd0 && data[1] === 0xcf && data[2] === 0x11 && data[3] === 0xe0
    && data[4] === 0xa1 && data[5] === 0xb1 && data[6] === 0x1a && data[7] === 0xe1) return 'doc'
  return null
}

/** 投稿附件全量校验；失败抛 DomainError（413 / 422）。 */
export function validateAttachment(raw: RawAttachment): ValidatedAttachment {
  if (!raw.data || raw.data.length === 0) {
    throw new DomainError(422, '附件内容为空，请重新选择文件')
  }
  if (raw.data.length > MAX_ATTACHMENT_BYTES) {
    throw new DomainError(413, '附件大小不能超过 10MB')
  }

  const fileName = sanitizeFileName(raw.fileName)
  const ext = extensionOf(fileName)
  if (!ATTACHMENT_EXTENSIONS.includes(ext as AttachmentExtension)) {
    throw new DomainError(422, '附件仅支持 PDF 或 Word（.pdf / .doc / .docx）')
  }

  const sniffed = sniffAttachmentType(raw.data)
  if (!sniffed || sniffed !== ext) {
    throw new DomainError(422, '文件内容与扩展名不符，请上传真实的 PDF 或 Word 文档')
  }

  return {
    fileName,
    ext,
    contentType: EXT_MIME[ext],
    size: raw.data.length,
    data: raw.data,
  }
}

/** OSS 对象键：不可预测（随机 UUID 段），与 abstractId/版本解耦（先传对象再落库）。 */
export function attachmentObjectKey(ext: AttachmentExtension): string {
  return `abstracts/${new Date().toISOString().slice(0, 10)}/${randomBytes(16).toString('hex')}.${ext}`
}

/** 下载响应头：中文文件名走 RFC 5987 filename*，ASCII 兜底。 */
export function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
