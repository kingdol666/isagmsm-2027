import { Client } from 'minio'
import type { ValidatedAttachment } from '../utils/attachment'
import { attachmentObjectKey } from '../utils/attachment'

/**
 * 对象存储（投稿附件 OSS）— MinIO S3 兼容端点。
 * 配置来自环境变量（OSS_*，见 .env.example）；docker compose 提供 pps-minio 容器。
 * 桶名/端点均为运维配置，不来自用户输入；仅本服务触达 OSS。
 */

const BUCKET = process.env.OSS_BUCKET ?? 'pps-abstracts'

const client = new Client({
  endPoint: process.env.OSS_ENDPOINT ?? 'localhost',
  port: Number(process.env.OSS_PORT ?? 9100),
  useSSL: process.env.OSS_USE_SSL === 'true',
  accessKey: process.env.OSS_ACCESS_KEY ?? 'ppsoss',
  secretKey: process.env.OSS_SECRET_KEY ?? 'pps-oss-dev-pw',
})

/** 桶确保只跑一次；失败则重置以便下次调用重试（容器晚于应用就绪时自愈）。 */
let readyPromise: Promise<void> | null = null

function ensureReady(): Promise<void> {
  readyPromise ??= (async () => {
    const exists = await client.bucketExists(BUCKET)
    if (!exists) await client.makeBucket(BUCKET, 'us-east-1')
  })().catch((error) => {
    readyPromise = null
    throw error
  })
  return readyPromise
}

/** 上传附件（先传对象、后落库；失败由调用方整体放弃本次投稿）。返回对象键。 */
export async function putAbstractFile(att: ValidatedAttachment): Promise<string> {
  await ensureReady()
  const key = attachmentObjectKey(att.ext)
  await client.putObject(BUCKET, key, att.data, att.size, {
    'Content-Type': att.contentType,
    // HTTP 头不允许非 ASCII：原始文件名（可能为中文）不入对象元数据，
    // 下载时的 content-disposition 由 DB 中的 fileName 经 RFC 5987 构造。
    'Content-Disposition': `attachment; filename="${att.ext}-attachment.${att.ext}"`,
  })
  return key
}

/** 按对象键读取附件内容（≤10MB，整段缓冲即可）。对象不存在时返回 null。 */
export async function getAbstractFileBuffer(key: string): Promise<Buffer | null> {
  try {
    const stream = await client.getObject(BUCKET, key)
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    return Buffer.concat(chunks)
  }
  catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === 'NoSuchKey') return null
    throw error
  }
}

export const abstractStorage = { putAbstractFile, getAbstractFileBuffer }
export type AbstractStorageAdapter = typeof abstractStorage
