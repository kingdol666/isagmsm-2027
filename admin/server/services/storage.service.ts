import { Client } from 'minio'

/**
 * 管理台侧的对象存储访问（投稿附件下载）— 与门户共用同一个 MinIO。
 * 桶由门户在首次上传时创建；这里只读。配置见 admin/.env.example。
 */

const BUCKET = process.env.OSS_BUCKET ?? 'pps-abstracts'

const client = new Client({
  endPoint: process.env.OSS_ENDPOINT ?? 'localhost',
  port: Number(process.env.OSS_PORT ?? 9100),
  useSSL: process.env.OSS_USE_SSL === 'true',
  accessKey: process.env.OSS_ACCESS_KEY ?? 'ppsoss',
  secretKey: process.env.OSS_SECRET_KEY ?? 'pps-oss-dev-pw',
})

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
