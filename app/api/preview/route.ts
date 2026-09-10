import { MAX_PREVIEW_BYTES, validateHtml } from '@/lib/scenes/draft'

export const runtime = 'nodejs'

const sandboxPolicy = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  'sandbox allow-scripts',
].join('; ')

function previewResponse(html: string, status = 200) {
  return new Response(html, { status, headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': sandboxPolicy,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  } })
}

function previewError(message: string, status: number) {
  const safe = message.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return previewResponse(`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>预览未启动</title><style>body{background:#151e24;color:#e6edef;font:16px/1.7 system-ui;padding:32px}p{max-width:45em}</style></head><body><h1>预览未启动</h1><p>${safe}</p></body></html>`, status)
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.startsWith('multipart/form-data')) return previewError('请从资料编辑器提交 HTML 文件。', 415)
  if (Number(request.headers.get('content-length') ?? 0) > MAX_PREVIEW_BYTES) return previewError('请求不能超过 4 MB。', 413)
  const reader = request.body?.getReader()
  if (!reader) return previewError('请求内容为空。', 400)
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_PREVIEW_BYTES) { await reader.cancel(); return previewError('请求不能超过 4 MB。', 413) }
      chunks.push(value)
    }
    const payload = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) { payload.set(chunk, offset); offset += chunk.length }
    const data = await new Response(payload, { headers: { 'Content-Type': contentType } }).formData()
    const html = data.get('html')
    if (typeof html !== 'string') return previewError('缺少 HTML 内容。', 422)
    const error = validateHtml(html)
    if (error) return previewError(error, 422)
    return previewResponse(html)
  } catch {
    return previewError('无法读取文件，请检查 HTML 或重新导入。', 400)
  } finally { reader.releaseLock() }
}

export function HEAD() { return previewResponse('') }

export function GET() { return previewError('此端点仅用于临时隔离预览，不保存或发布作品。', 405) }
