import { MAX_COVER_BYTES } from './draft'

export function downloadText(filename: string, contents: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([contents], { type: `${type};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function resolveCover(source: string): Promise<string> {
  if (!source) return ''
  if (source === '/images/rainy-konbini.png') {
    const response = await fetch(source)
    if (!response.ok) throw new Error('无法读取内置封面，请重试或选择本地封面。')
    return readCover(new File([await response.blob()], 'cover.png', { type: 'image/png' }))
  }
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(source)
  if (!match || match[2].length > Math.ceil(MAX_COVER_BYTES / 3) * 4) throw new Error('封面不是有效的本地图像，或超过 2 MB。')
  const binary = atob(match[2])
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return readCover(new File([bytes], 'cover', { type: match[1] }))
}

export async function readCover(file: File): Promise<string> {
  if (file.size > MAX_COVER_BYTES) throw new Error('封面不能超过 2 MB。')
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('只支持 PNG、JPEG 和 WebP，不接受 SVG。')
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  if (!(png && file.type === 'image/png' || jpeg && file.type === 'image/jpeg' || webp && file.type === 'image/webp')) throw new Error('文件内容与图像格式不符。')
  const bitmap = await createImageBitmap(file)
  const valid = bitmap.width > 0 && bitmap.height > 0 && bitmap.width <= 8192 && bitmap.height <= 8192
  bitmap.close()
  if (!valid) throw new Error('图像长宽不能超过 8192 像素。')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('无法读取图像。'))
    reader.onerror = () => reject(new Error('无法读取图像。'))
    reader.readAsDataURL(file)
  })
}
