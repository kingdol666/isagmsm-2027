/** 下载响应头：中文文件名走 RFC 5987 filename*，ASCII 兜底（与门户 server/utils/attachment.ts 行为一致）。 */
export function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
