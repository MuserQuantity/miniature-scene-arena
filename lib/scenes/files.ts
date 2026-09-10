import { constants } from 'node:fs'
import { open } from 'node:fs/promises'
import sharp from 'sharp'
import { MAX_COVER_BYTES, SceneError } from './schema'

export function isErrno(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

export async function readBoundedFile(filename: string, maximum: number) {
  const file = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await file.stat()
    if (!stat.isFile() || stat.size > maximum) throw new SceneError(500, 'STORAGE_INVALID', '场景存储文件不符合大小或格式要求。')
    const data = await file.readFile()
    if (data.byteLength > maximum) throw new SceneError(500, 'STORAGE_INVALID', '场景存储文件超过大小限制。')
    return data
  } finally {
    await file.close()
  }
}

export async function normalizeCover(source: string): Promise<Buffer | undefined> {
  if (!source) return undefined
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(source)
  if (!match) throw new SceneError(422, 'INVALID_COVER', '封面只接受 PNG、JPEG 或 WebP data URL。')
  const input = Buffer.from(match[2], 'base64')
  if (!input.length || input.length > MAX_COVER_BYTES || input.toString('base64').replace(/=+$/, '') !== match[2].replace(/=+$/, '')) {
    throw new SceneError(422, 'INVALID_COVER', '封面不是有效的 base64 图像，或超过 2 MiB。')
  }
  try {
    const image = sharp(input, { limitInputPixels: 8192 * 8192, failOn: 'warning' })
    const metadata = await image.metadata()
    if (metadata.format !== match[1] || !metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192 || (metadata.pages ?? 1) > 1) {
      throw new Error('Invalid image format or dimensions')
    }
    const output = await image.rotate().resize({ width: 1440, height: 1000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
    if (output.length > MAX_COVER_BYTES) throw new Error('Normalized image is too large')
    return output
  } catch {
    throw new SceneError(422, 'INVALID_COVER', '封面无法解码，格式不匹配、包含动画或尺寸超过 8192 像素。')
  }
}
