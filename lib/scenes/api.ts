import { createHash, timingSafeEqual } from 'node:crypto'
import { ZodError } from 'zod'
import { isErrno } from './files'
import { MAX_SCENE_BYTES, SceneError } from './schema'

export function requireApiKey(request: Request) {
  const expected = process.env.SCENE_API_KEY ?? ''
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(expected)) throw new SceneError(503, 'API_NOT_CONFIGURED', '场景管理 API 尚未配置有效的密钥。')
  const received = request.headers.get('x-api-key') ?? ''
  const digest = (value: string) => createHash('sha256').update(value).digest()
  if (!timingSafeEqual(digest(expected), digest(received))) throw new SceneError(401, 'UNAUTHORIZED', '需要有效的 X-API-Key。')
}

export function sceneJson(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

export async function sceneApi(request: Request, handler: () => Promise<Response>) {
  try {
    requireApiKey(request)
    return await handler()
  } catch (error) {
    if (error instanceof SceneError) return sceneJson({ error: { code: error.code, message: error.message } }, error.status)
    if (error instanceof ZodError) {
      return sceneJson({ error: { code: 'VALIDATION_ERROR', message: '场景资料校验失败。', fields: error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })) } }, 422)
    }
    if (isErrno(error, 'ELOCKED')) return sceneJson({ error: { code: 'STORAGE_BUSY', message: '有其他写操作正在进行，请稍后重试。' } }, 503, { 'Retry-After': '1' })
    return sceneJson({ error: { code: 'INTERNAL_ERROR', message: '场景服务暂时无法完成请求，请检查存储配置。' } }, 500)
  }
}

export function sceneEtag(version: number) {
  return `"${version}"`
}

export function expectedSceneVersion(request: Request) {
  const header = request.headers.get('if-match')
  if (!header) throw new SceneError(428, 'VERSION_REQUIRED', '修改前请先 GET 场景，并通过 If-Match 提交它的 ETag。')
  const match = /^"([1-9]\d*)"$/.exec(header)
  const version = match ? Number(match[1]) : NaN
  if (!Number.isSafeInteger(version)) throw new SceneError(400, 'INVALID_VERSION', 'If-Match 必须是 GET 返回的版本 ETag。')
  return version
}

export async function readSceneJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new SceneError(415, 'UNSUPPORTED_MEDIA_TYPE', '请使用 application/json 提交场景。')
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_SCENE_BYTES) throw new SceneError(413, 'PAYLOAD_TOO_LARGE', '完整请求不能超过 8 MiB。')
  const reader = request.body?.getReader()
  if (!reader) throw new SceneError(400, 'INVALID_JSON', '请求内容不能为空。')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_SCENE_BYTES) {
        await reader.cancel()
        throw new SceneError(413, 'PAYLOAD_TOO_LARGE', '完整请求不能超过 8 MiB。')
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  let data: unknown
  try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))) }
  catch { throw new SceneError(400, 'INVALID_JSON', '请求内容不是有效的 UTF-8 JSON。') }
  const key = process.env.SCENE_API_KEY
  if (key && JSON.stringify(data).includes(key)) throw new SceneError(422, 'CREDENTIAL_IN_CONTENT', '场景内容中不能包含管理 API 密钥。')
  return data
}
