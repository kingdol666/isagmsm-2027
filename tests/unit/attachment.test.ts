import { describe, expect, it } from 'vitest'
import {
  attachmentObjectKey,
  contentDisposition,
  sanitizeFileName,
  sniffAttachmentType,
  validateAttachment,
} from '../../server/utils/attachment'
import { DomainError } from '../../server/services/registration.service'
import { MAX_ATTACHMENT_BYTES } from '../../shared/schemas/abstract'

/**
 * 投稿附件校验（纯函数）：扩展名白名单 + 魔数嗅探 + 大小上限 + 文件名净化。
 * 服务端不信任客户端的任何字段 —— 附件内容必须与扩展名一致才能入库。
 */

const docxBytes = () => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64, 0x61)])
const pdfBytes = () => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 0x20)])
const docBytes = () => Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(64, 0x00)])

function expectDomainError(fn: () => unknown, status: number) {
  try {
    fn()
    expect.unreachable('expected DomainError')
  }
  catch (error) {
    expect(error).toBeInstanceOf(DomainError)
    expect((error as { statusCode: number }).statusCode).toBe(status)
  }
}

describe('sniffAttachmentType', () => {
  it('recognises pdf / docx / doc magic bytes and rejects anything else', () => {
    expect(sniffAttachmentType(pdfBytes())).toBe('pdf')
    expect(sniffAttachmentType(docxBytes())).toBe('docx')
    expect(sniffAttachmentType(docBytes())).toBe('doc')
    expect(sniffAttachmentType(Buffer.from('plain text, not a document'))).toBeNull()
    expect(sniffAttachmentType(Buffer.from('PK'))).toBeNull()
    expect(sniffAttachmentType(Buffer.alloc(0))).toBeNull()
  })
})

describe('sanitizeFileName', () => {
  it('strips path components, control chars and caps length', () => {
    expect(sanitizeFileName('..\\..\\etc\\paper.pdf')).toBe('paper.pdf')
    expect(sanitizeFileName('/etc/passwd.pdf')).toBe('passwd.pdf')
    expect(sanitizeFileName('报告\u0000\u001f终稿.docx')).toBe('报告终稿.docx')
    expect(sanitizeFileName('')).toBe('attachment')
    expect(sanitizeFileName('.hidden.pdf')).toBe('attachment')
    expect(sanitizeFileName(`${'x'.repeat(300)}.pdf`)).toHaveLength(180)
  })
})

describe('validateAttachment', () => {
  it('accepts a genuine pdf/docx/doc regardless of client mime', () => {
    for (const [name, data, type] of [
      ['paper.pdf', pdfBytes(), 'application/pdf'],
      ['论文.docx', docxBytes(), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['manuscript.DOC', docBytes(), 'application/msword'],
    ] as const) {
      const att = validateAttachment({ fileName: name, contentType: 'application/octet-stream', data })
      expect(att.ext).toBe(name.split('.').pop()!.toLowerCase())
      expect(att.contentType).toBe(type)
      expect(att.size).toBe(data.length)
    }
  })

  it('rejects oversized files with 413 before content checks', () => {
    const big = Buffer.concat([Buffer.from('%PDF'), Buffer.alloc(MAX_ATTACHMENT_BYTES, 0x20)])
    expectDomainError(() => validateAttachment({ fileName: 'big.pdf', data: big }), 413)
  })

  it('rejects empty content and disallowed extensions with 422', () => {
    expectDomainError(() => validateAttachment({ fileName: 'empty.pdf', data: Buffer.alloc(0) }), 422)
    expectDomainError(() => validateAttachment({ fileName: 'page.html', data: Buffer.from('<html></html>') }), 422)
    expectDomainError(() => validateAttachment({ fileName: 'noext', data: pdfBytes() }), 422)
  })

  it('rejects content that does not match the declared extension', () => {
    expectDomainError(() => validateAttachment({ fileName: 'fake.pdf', data: Buffer.from('not a pdf at all') }), 422)
    expectDomainError(() => validateAttachment({ fileName: 'fake.docx', data: pdfBytes() }), 422)
    expectDomainError(() => validateAttachment({ fileName: 'fake.pdf', data: docxBytes() }), 422)
  })
})

describe('attachmentObjectKey', () => {
  it('is unique, date-prefixed and keeps the whitelisted extension', () => {
    const a = attachmentObjectKey('pdf')
    const b = attachmentObjectKey('pdf')
    expect(a).not.toBe(b)
    expect(a).toMatch(/^abstracts\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{32}\.pdf$/)
    expect(attachmentObjectKey('docx')).toMatch(/\.docx$/)
  })
})

describe('contentDisposition', () => {
  it('keeps a fallback ASCII name and an RFC 5987 UTF-8 name', () => {
    const header = contentDisposition('界面增强研究-终稿.pdf')
    expect(header).toContain(`filename*=UTF-8''${encodeURIComponent('界面增强研究-终稿.pdf')}`)
    expect(header).toMatch(/^attachment; filename="[\x20-\x7e]+\.pdf"; /)
    expect(contentDisposition('plain.pdf')).toContain('filename="plain.pdf"')
  })
})
