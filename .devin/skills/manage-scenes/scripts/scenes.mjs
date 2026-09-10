import { randomBytes, randomUUID } from 'node:crypto'
import { lstat, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { parseArgs, parseEnv } from 'node:util'
import { pathToFileURL } from 'node:url'

const MAX_HTML_BYTES = 4 * 1024 * 1024 - 16 * 1024
const MAX_COVER_BYTES = 2 * 1024 * 1024
const MAX_BODY_BYTES = 8 * 1024 * 1024
const metadataFields = new Set(['title', 'slug', 'subtitle', 'description', 'category', 'tags', 'prompt', 'promptSource', 'model', 'modelVersion', 'thinking', 'agent', 'agentVersion', 'parameters', 'notes'])
let redactionKey = process.env.SCENE_API_KEY ?? ''

const help = `Scene management

pnpm scenes init-key [--config .env]
pnpm scenes list [--config .env]
pnpm scenes get <id> [--config .env]
pnpm scenes code <id> --out <new-file.html> [--config .env]
pnpm scenes create --metadata <metadata.json> --html <scene.html> [--cover <cover.png>] [--confirm]
pnpm scenes update <id> --version <version> [--metadata <patch.json>] [--html <scene.html>] [--cover <cover.png> | --clear-cover] [--confirm]

Without --confirm, create/update only validate local files and print a plan.
The client reads SCENE_API_URL (or SITE_URL) and SCENE_API_KEY from the environment or --config.
API keys are never accepted as command-line arguments or printed.
`

function output(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  console.log(redactionKey ? text.replaceAll(redactionKey, '[REDACTED]') : text)
}

async function environmentFile(filename) {
  try { return await readFile(filename, 'utf8') }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error }
}

export function resolveApiOrigin(environment) {
  let value = environment.SCENE_API_URL || environment.SITE_URL
  if (!value) throw new Error('请配置 SCENE_API_URL 或 SITE_URL。')
  for (let index = 0; index < 8 && /\$\{/.test(value); index++) {
    value = value.replace(/\$\{(SITE_URL|TRAEFIK_DOMAIN)\}/g, (_, name) => environment[name] || '')
  }
  if (/\$\{/.test(value)) throw new Error('站点地址包含未解析的变量；只支持引用 SITE_URL 和 TRAEFIK_DOMAIN。')
  let url
  try { url = new URL(value) } catch { throw new Error('SCENE_API_URL 必须是有效的站点源地址。') }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('站点地址不能包含凭据、查询参数或路径。')
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error('管理接口必须使用 HTTPS，仅本机地址允许 HTTP。')
  if (url.hostname === 'example.com' || url.hostname.endsWith('.example.com')) throw new Error('请先把示例域名替换为你的真实 SCENE_API_URL。')
  if (environment.SCENE_API_KEY && url.href.includes(environment.SCENE_API_KEY)) throw new Error('站点地址不能包含 API 密钥。')
  if (url.protocol === 'https:' && environment.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('不得关闭管理接口的 TLS 证书校验。')
  return url.origin
}

async function configuration(filename, requireKey) {
  const environment = { ...parseEnv(await environmentFile(filename)), ...process.env }
  redactionKey = environment.SCENE_API_KEY || ''
  if (requireKey && !/^[A-Za-z0-9_-]{32,128}$/.test(redactionKey)) throw new Error('请配置与服务器一致的 SCENE_API_KEY；不要在对话中粘贴密钥。')
  return { origin: resolveApiOrigin(environment), key: redactionKey }
}

export async function initializeKey(filename) {
  const target = path.resolve(filename)
  if (!/^\.env(?:\..+)?$/.test(path.basename(target)) || /\.(example|sample|template)$/.test(target)) throw new Error('密钥只能写入私有 .env 文件，不能写入模板或源码。')
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', target], { cwd: path.dirname(target), stdio: 'ignore' })
  if (tracked.status === 0) throw new Error('环境文件已被 Git 跟踪，拒绝写入密钥。')
  const existingStat = await lstat(target).catch((error) => { if (error.code !== 'ENOENT') throw error })
  if (existingStat?.isSymbolicLink()) throw new Error('不能替换符号链接形式的环境文件。')
  const lockPath = `${target}.init.lock`
  let lock
  try { lock = await open(lockPath, 'wx', 0o600) }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('检测到密钥初始化锁，请确认没有其他初始化进程；不会覆盖现有配置。')
    throw error
  }
  const temporary = `${target}.${randomUUID()}.tmp`
  try {
    const original = await environmentFile(target)
    let source = original
    if (!existingStat) source = await environmentFile(`${target}.example`)
    const lines = source.match(/^[ \t]*(?:export[ \t]+)?SCENE_API_KEY[ \t]*=[^\r\n]*/gm) ?? []
    if (lines.length > 1) throw new Error('环境文件存在重复 SCENE_API_KEY，请先人工整理。')
    const existing = parseEnv(source).SCENE_API_KEY || process.env.SCENE_API_KEY
    if (existing) {
      if (!/^[A-Za-z0-9_-]{32,128}$/.test(existing)) throw new Error('已有密钥格式不正确，需要人工检查；不会自动覆盖。')
      return { status: 'unchanged', message: '已配置 SCENE_API_KEY，未覆盖或显示密钥。' }
    }
    const key = randomBytes(32).toString('hex')
    const newline = source.includes('\r\n') ? '\r\n' : '\n'
    const emptyKey = /^([ \t]*(?:export[ \t]+)?SCENE_API_KEY[ \t]*=[ \t]*)(?:""|'')?([ \t]*(?:#[^\r\n]*)?)$/m
    if (lines.length) {
      if (!emptyKey.test(source)) throw new Error('不能安全更新密钥字段，请先人工整理环境文件。')
      source = source.replace(emptyKey, (_, prefix, suffix) => `${prefix}${key}${suffix}`)
    } else {
      source = `${source}${source && !source.endsWith('\n') ? newline : ''}SCENE_API_KEY=${key}${newline}`
    }
    await writeFile(temporary, source, { flag: 'wx', mode: 0o600, flush: true })
    if (await environmentFile(target) !== original) throw new Error('环境文件被其他进程修改，已取消密钥写入。')
    await rename(temporary, target)
    return { status: 'created', message: 'SCENE_API_KEY 已写入私有环境文件；密钥未显示，请将同一个密钥安全配置到服务器和调用端。' }
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error })
    await lock.close()
    await unlink(lockPath)
  }
}

async function localFile(filename, maximum) {
  const info = await stat(filename)
  if (!info.isFile() || info.size > maximum) throw new Error('输入文件类型不正确或超过大小限制。')
  const contents = await readFile(filename)
  if (contents.length > maximum) throw new Error('输入文件超过大小限制。')
  return contents
}

async function payloadFor(command, values) {
  let metadata = {}
  if (values.metadata) {
    try { metadata = JSON.parse((await localFile(values.metadata, 256 * 1024)).toString('utf8').replace(/^\uFEFF/, '')) }
    catch { throw new Error('元数据必须是小于 256 KiB 的有效 JSON 文件。') }
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') throw new Error('元数据必须是 JSON 对象。')
    if (Object.keys(metadata).some((name) => !metadataFields.has(name) || command === 'update' && name === 'slug')) throw new Error('元数据包含不允许的字段；ID、地址和版本不能通过修改操作更改。')
  }
  const payload = { ...metadata }
  if (values.html) {
    payload.html = new TextDecoder('utf-8', { fatal: true }).decode(await localFile(values.html, MAX_HTML_BYTES))
    if (!/<html(?:\s|>)/i.test(payload.html) || !/<\/html\s*>/i.test(payload.html)) throw new Error('场景程序必须是完整的单文件 HTML。')
  }
  if (values.cover && values['clear-cover']) throw new Error('--cover 和 --clear-cover 不能同时使用。')
  if (values.cover) {
    const type = { '.png': 'png', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.webp': 'webp' }[path.extname(values.cover).toLowerCase()]
    if (!type) throw new Error('封面只支持 PNG、JPEG 或 WebP。')
    payload.cover = `data:image/${type};base64,${(await localFile(values.cover, MAX_COVER_BYTES)).toString('base64')}`
  }
  if (values['clear-cover']) payload.cover = ''
  if (command === 'create' && (typeof payload.title !== 'string' || payload.title.trim().length < 2 || payload.title.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug ?? '') || !payload.html)) {
    throw new Error('新建需要标题、合法地址，以及 --html 指定的完整 HTML。')
  }
  if (!Object.keys(payload).length) throw new Error('没有需要提交的修改。')
  const encoded = JSON.stringify(payload)
  if (Buffer.byteLength(encoded) > MAX_BODY_BYTES) throw new Error('完整请求不能超过 8 MiB。')
  if (redactionKey && encoded.includes(redactionKey)) throw new Error('场景内容中出现了管理 API 密钥，已阻止上传。')
  return payload
}

async function apiRequest(config, endpoint, { method = 'GET', body, version, text = false } = {}) {
  const headers = { 'X-API-Key': config.key }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (version !== undefined) headers['If-Match'] = `"${version}"`
  const response = await fetch(new URL(`/api/v1/scenes${endpoint}`, config.origin), {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`HTTP ${response.status}: ${error.error?.code ?? ''} ${error.error?.message ?? '接口请求失败'}`)
  }
  if (text) {
    if (!response.headers.get('content-type')?.startsWith('text/plain')) throw new Error('接口未返回预期的场景源码。')
    return { contents: await response.text(), etag: response.headers.get('etag') }
  }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('接口未返回预期的 JSON；请检查站点地址和部署版本。')
  return response.json()
}

export async function main(args = process.argv.slice(2)) {
  let parsed
  try {
    parsed = parseArgs({ args, allowPositionals: true, options: {
      'config': { type: 'string', default: '.env' }, metadata: { type: 'string' }, html: { type: 'string' }, cover: { type: 'string' },
      version: { type: 'string' }, out: { type: 'string' }, 'clear-cover': { type: 'boolean' }, confirm: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    } })
  } catch { throw new Error('命令参数无效，请运行 pnpm scenes --help 查看用法。') }
  const { values, positionals } = parsed
  if (values.help || !positionals.length) { output(help); return }
  const [command, id, ...extra] = positionals
  if (extra.length || !['init-key', 'list', 'get', 'code', 'create', 'update'].includes(command)) throw new Error('未知命令或多余参数，请查看 --help。')
  if (command === 'init-key') { output(await initializeKey(values['config'])); return }
  if (['get', 'code', 'update'].includes(command) && !/^scene-[a-z0-9-]+$/.test(id ?? '')) throw new Error('请提供 list/get 返回的场景 ID。')
  if (['list', 'create'].includes(command) && id) throw new Error('此命令不接受场景 ID 参数。')
  const writing = command === 'create' || command === 'update'
  const config = await configuration(values['config'], !writing || Boolean(values.confirm))
  if (command === 'list') {
    const data = await apiRequest(config, '')
    if (!Array.isArray(data.scenes)) throw new Error('接口返回的场景列表格式不正确。')
    output({ scenes: data.scenes.map(({ id, slug, title, renderer, version, updatedAt }) => ({ id, slug, title, renderer, version, updatedAt })) })
    return
  }
  if (command === 'get') { output(await apiRequest(config, `/${encodeURIComponent(id)}`)); return }
  if (command === 'code') {
    if (!values.out) throw new Error('下载源码时必须使用 --out 指定新文件，不会覆盖已有文件。')
    const result = await apiRequest(config, `/${encodeURIComponent(id)}/code`, { text: true })
    await writeFile(values.out, result.contents, { flag: 'wx', mode: 0o600 })
    output({ file: values.out, etag: result.etag })
    return
  }
  const version = values.version === undefined ? undefined : Number(values.version)
  if (command === 'update' && (!Number.isSafeInteger(version) || version < 1)) throw new Error('修改前请先 get，并用 --version 提供读取到的版本号。')
  const body = await payloadFor(command, values)
  if (!values.confirm) {
    output({ mode: 'dry-run', operation: command, origin: config.origin, id, version, title: body.title, slug: body.slug, fields: Object.keys(body), htmlBytes: body.html ? Buffer.byteLength(body.html) : 0, requestBytes: Buffer.byteLength(JSON.stringify(body)), message: '尚未提交。确认目标与内容后添加 --confirm。' })
    return
  }
  const result = await apiRequest(config, command === 'create' ? '' : `/${encodeURIComponent(id)}`, { method: command === 'create' ? 'POST' : 'PATCH', body, version })
  output(result)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : '场景命令执行失败。'
    console.error(redactionKey ? message.replaceAll(redactionKey, '[REDACTED]') : message)
    process.exitCode = 1
  })
}
