import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { execFile } from 'node:child_process'
import { createServer, type RequestListener, type Server } from 'node:http'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseEnv, promisify } from 'node:util'
import { initializeKey, resolveApiOrigin } from '../../.devin/skills/manage-scenes/scripts/scenes.mjs'

const execute = promisify(execFile)
const script = path.resolve('.devin/skills/manage-scenes/scripts/scenes.mjs')
const key = 'client-test-only-api-key-not-for-production'
let directory: string
let previousKey: string | undefined
let server: Server | undefined

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'scene-cli-'))
  previousKey = process.env.SCENE_API_KEY
  delete process.env.SCENE_API_KEY
})
afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()))
  server = undefined
  await rm(directory, { recursive: true, force: true })
  if (previousKey === undefined) delete process.env.SCENE_API_KEY
  else process.env.SCENE_API_KEY = previousKey
})

async function run(args: string[], origin = 'http://127.0.0.1:3100') {
  return execute(process.execPath, [script, ...args, '--config', path.join(directory, '.env')], {
    env: { ...process.env, SCENE_API_KEY: key, SCENE_API_URL: origin },
  })
}

async function mockApi(handler: RequestListener) {
  server = createServer(handler)
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  return `http://127.0.0.1:${address.port}`
}

const deletionRecord = { prompt: { id: 'prompt-delete', slug: 'delete-topic', title: '待删除题目', version: 3 }, scenes: [{ id: 'scene-linked', slug: 'linked-run', title: '关联作品', model: '测试模型', agent: '测试 Agent', version: 7 }] }

const sceneDeletionRecord = { scene: { id: 'scene-delete', slug: 'delete-single', title: '待删除场景', model: '测试模型', agent: '测试 Agent', promptId: 'prompt-keep', version: 4 } }

test('single-scene deletion dry-runs identify the exact run and only read', async () => {
  const requests: string[] = []
  const origin = await mockApi((request, response) => {
    requests.push(`${request.method} ${request.url}`)
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(sceneDeletionRecord))
  })
  const result = await run(['delete', 'scene-delete', '--version', '4'], origin)
  const plan = JSON.parse(result.stdout)
  assert.equal(plan.mode, 'dry-run')
  assert.equal(plan.resource, 'scenes')
  assert.equal(plan.operation, 'delete')
  assert.equal(plan.origin, origin)
  assert.equal(plan.id, 'scene-delete')
  assert.equal(plan.title, '待删除场景')
  assert.equal(plan.model, '测试模型')
  assert.equal(plan.promptId, 'prompt-keep')
  assert.equal(plan.assetsRetained, true)
  assert.deepEqual(requests, ['GET /api/v1/scenes/scene-delete'])
  assert.ok(!result.stdout.includes(key))
})

test('confirmed single-scene deletion sends only an empty payload and the reviewed version', async () => {
  const received: { method?: string; url?: string; key?: string; version?: string; body?: unknown }[] = []
  const origin = await mockApi(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    received.push({ method: request.method, url: request.url, key: request.headers['x-api-key'] as string, version: request.headers['if-match'] as string, body: body ? JSON.parse(body) : undefined })
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(request.method === 'GET' ? sceneDeletionRecord : { deletedScene: sceneDeletionRecord.scene, assetsRetained: true }))
  })
  const result = await run(['delete', 'scene-delete', '--version', '4', '--confirm'], origin)
  assert.deepEqual(received.map(item => item.method), ['GET', 'DELETE'])
  assert.deepEqual(received[1], { method: 'DELETE', url: '/api/v1/scenes/scene-delete', key, version: '"4"', body: {} })
  assert.equal(JSON.parse(result.stdout).deletedScene.id, 'scene-delete')
  assert.ok(!result.stdout.includes(key))
})

test('single-scene deletion stops on changed versions or mismatched response identities', async () => {
  const methods: string[] = []
  let current = structuredClone(sceneDeletionRecord)
  const origin = await mockApi((request, response) => {
    methods.push(request.method!)
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(current))
  })
  const args = ['delete', 'scene-delete', '--version', '4', '--confirm']
  current.scene.version = 5
  await assert.rejects(run(args, origin), /版本/)
  current = structuredClone(sceneDeletionRecord)
  current.scene.id = 'scene-different'
  await assert.rejects(run(args, origin), /格式/)
  assert.deepEqual(methods, ['GET', 'GET'])
})

test('single-scene deletion rejects file options and requires a version before network access', async () => {
  for (const option of ['--metadata', '--html', '--cover', '--body', '--out', '--clear-cover']) {
    const args = ['delete', 'scene-delete', '--version', '4', option, ...(option === '--clear-cover' ? [] : ['unused-file'])]
    await assert.rejects(run(args, 'http://127.0.0.1:1'), /删除/)
  }
  await assert.rejects(run(['delete', 'scene-delete'], 'http://127.0.0.1:1'), /--version/)
})

test('single-scene deletion never retries a failed write or switches to prompt deletion', async () => {
  const requests: string[] = []
  const origin = await mockApi((request, response) => {
    requests.push(`${request.method} ${request.url}`)
    response.writeHead(request.method === 'GET' ? 200 : 412, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(request.method === 'GET' ? sceneDeletionRecord : { error: { code: 'VERSION_CONFLICT', message: '版本已变化' } }))
  })
  await assert.rejects(run(['delete', 'scene-delete', '--version', '4', '--confirm'], origin), /HTTP 412/)
  assert.deepEqual(requests, ['GET /api/v1/scenes/scene-delete', 'DELETE /api/v1/scenes/scene-delete'])
})

test('prompt deletion dry-runs read the target but never send a write', async () => {
  const methods: string[] = []
  const origin = await mockApi((request, response) => {
    methods.push(request.method!)
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(deletionRecord))
  })
  const filename = path.join(directory, 'delete-plan.json')
  await writeFile(filename, JSON.stringify({ scenes: [{ id: 'scene-linked', version: 7 }] }))
  const result = await run(['prompts', 'delete', 'prompt-delete', '--version', '3', '--metadata', filename], origin)
  const plan = JSON.parse(result.stdout)
  assert.equal(plan.mode, 'dry-run')
  assert.equal(plan.operation, 'delete')
  assert.equal(plan.title, '待删除题目')
  assert.equal(plan.version, 3)
  assert.equal(plan.assetsRetained, true)
  assert.equal(plan.scenes[0].id, 'scene-linked')
  assert.deepEqual(methods, ['GET'])
  assert.ok(!result.stdout.includes(key))
})

test('confirmed deletion sends an exact child-version plan and parent If-Match', async () => {
  const received: { method?: string; key?: string; version?: string; body?: unknown }[] = []
  const origin = await mockApi(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    received.push({ method: request.method, key: request.headers['x-api-key'] as string, version: request.headers['if-match'] as string, body: body ? JSON.parse(body) : undefined })
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(request.method === 'GET' ? deletionRecord : { deletedPrompt: deletionRecord.prompt, deletedScenes: deletionRecord.scenes, assetsRetained: true }))
  })
  const filename = path.join(directory, 'delete-plan.json')
  await writeFile(filename, JSON.stringify({ scenes: [{ id: 'scene-linked', version: 7 }] }))
  const result = await run(['prompts', 'delete', 'prompt-delete', '--version', '3', '--metadata', filename, '--confirm'], origin)
  assert.deepEqual(received.map(item => item.method), ['GET', 'DELETE'])
  assert.deepEqual(received[1], { method: 'DELETE', key, version: '"3"', body: { scenes: [{ id: 'scene-linked', version: 7 }] } })
  assert.equal(JSON.parse(result.stdout).deletedPrompt.id, 'prompt-delete')
  assert.ok(!result.stdout.includes(key))
})

test('stale prompt versions and changed linked runs stop deletion before any write', async () => {
  const methods: string[] = []
  let current = structuredClone(deletionRecord)
  const origin = await mockApi((request, response) => {
    methods.push(request.method!)
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(current))
  })
  const filename = path.join(directory, 'delete-plan.json')
  await writeFile(filename, JSON.stringify({ scenes: [{ id: 'scene-linked', version: 7 }] }))
  const args = ['prompts', 'delete', 'prompt-delete', '--version', '3', '--metadata', filename, '--confirm']
  current.prompt.version = 4
  await assert.rejects(run(args, origin), /版本/)
  current = structuredClone(deletionRecord)
  current.scenes[0].version = 8
  await assert.rejects(run(args, origin), /关联作品|版本/)
  current = structuredClone(deletionRecord)
  current.scenes.push({ ...current.scenes[0], id: 'scene-new' })
  await assert.rejects(run(args, origin), /关联作品|集合/)
  current = structuredClone(deletionRecord)
  await assert.rejects(run(['prompts', 'delete', 'prompt-delete', '--version', '3', '--confirm'], origin), /关联作品|清单/)
  assert.ok(methods.every(method => method === 'GET'))
})

test('deletion rejects invalid local plans and unrelated file options', async () => {
  const filename = path.join(directory, 'delete-plan.json')
  for (const payload of [{ all: true }, { scenes: 'all' }, { scenes: [null] }, { scenes: [{ id: 'scene-linked', version: 0 }] }, { scenes: [{ id: 'scene-linked', version: 7, title: 'extra' }] }, { scenes: [{ id: 'scene-linked', version: 7 }, { id: 'scene-linked', version: 7 }] }]) {
    await writeFile(filename, JSON.stringify(payload))
    await assert.rejects(run(['prompts', 'delete', 'prompt-delete', '--version', '3', '--metadata', filename], 'http://127.0.0.1:1'), /字段|清单|版本|scenes/)
  }
  await assert.rejects(run(['prompts', 'delete', 'prompt-delete', '--version', '3', '--html', 'unused.html'], 'http://127.0.0.1:1'), /删除/)
  await assert.rejects(run(['prompts', 'delete', 'prompt-delete'], 'http://127.0.0.1:1'), /--version/)
})

test('failed deletion requests are not retried or replaced with a refreshed plan', async () => {
  const methods: string[] = []
  const origin = await mockApi((request, response) => {
    methods.push(request.method!)
    response.writeHead(request.method === 'GET' ? 200 : 412, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(request.method === 'GET' ? deletionRecord : { error: { code: 'VERSION_CONFLICT', message: '版本已变化' } }))
  })
  const filename = path.join(directory, 'delete-plan.json')
  await writeFile(filename, JSON.stringify({ scenes: [{ id: 'scene-linked', version: 7 }] }))
  await assert.rejects(run(['prompts', 'delete', 'prompt-delete', '--version', '3', '--metadata', filename, '--confirm'], origin), /HTTP 412/)
  assert.deepEqual(methods, ['GET', 'DELETE'])
})

test('initialization preserves configuration, creates a private key, and never rotates it', async () => {
  const filename = path.join(directory, '.env')
  await writeFile(filename, 'TRAEFIK_DOMAIN=arena.test\nSCENE_API_KEY=\n')
  const result = await initializeKey(filename)
  assert.equal(result.status, 'created')
  const contents = await readFile(filename, 'utf8')
  const parsed = parseEnv(contents)
  assert.equal(parsed.TRAEFIK_DOMAIN, 'arena.test')
  const generatedKey = parsed.SCENE_API_KEY
  assert.ok(generatedKey)
  assert.match(generatedKey, /^[a-f0-9]{64}$/)
  assert.equal((await stat(filename)).mode & 0o777, 0o600)
  assert.ok(!JSON.stringify(result).includes(generatedKey))
  assert.equal((await initializeKey(filename)).status, 'unchanged')
  assert.equal(await readFile(filename, 'utf8'), contents)
})

test('initialization refuses templates and source-code paths', async () => {
  await assert.rejects(initializeKey(path.join(directory, '.env.example')))
  await assert.rejects(initializeKey(path.join(directory, 'settings.json')))
})

test('API origins expand only public settings and reject unsafe credential transport', () => {
  assert.equal(resolveApiOrigin({ SCENE_API_URL: '${SITE_URL}', SITE_URL: 'https://${TRAEFIK_DOMAIN}', TRAEFIK_DOMAIN: 'arena.test' }), 'https://arena.test')
  assert.equal(resolveApiOrigin({ SITE_URL: 'http://127.0.0.1:3100' }), 'http://127.0.0.1:3100')
  for (const origin of ['http://arena.test', 'https://user:password@arena.test', 'https://arena.test/?api_key=secret', 'https://arena.test/api/v1', 'file:///tmp/test', 'https://scene.example.com']) {
    assert.throws(() => resolveApiOrigin({ SCENE_API_URL: origin }))
  }
  assert.throws(() => resolveApiOrigin({ SCENE_API_URL: 'https://${SCENE_API_KEY}.test', SCENE_API_KEY: key }))
  assert.throws(() => resolveApiOrigin({ SCENE_API_URL: 'https://arena.test', NODE_TLS_REJECT_UNAUTHORIZED: '0' }))
})

test('create defaults to a local dry-run without exposing credentials or HTML', async () => {
  const metadata = path.join(directory, 'metadata.json')
  const html = path.join(directory, 'scene.html')
  await writeFile(metadata, JSON.stringify({ title: '本地场景', slug: 'local-scene' }))
  await writeFile(html, '<html><body>private-source-marker</body></html>')
  const result = await run(['create', '--metadata', metadata, '--html', html], 'http://127.0.0.1:1')
  const plan = JSON.parse(result.stdout)
  assert.equal(plan.mode, 'dry-run')
  assert.equal(plan.operation, 'create')
  assert.ok(!result.stdout.includes(key))
  assert.ok(!result.stdout.includes('private-source-marker'))
})

test('prompt commands validate locally and dry-run without network access', async () => {
  const metadata = path.join(directory, 'prompt.json')
  const body = path.join(directory, 'prompt.md')
  await writeFile(metadata, JSON.stringify({ title: '本地题目', slug: 'local-prompt', number: '01' }))
  await writeFile(body, '# 01 本地题目\n\nprivate-prompt-marker')
  const result = await run(['prompts', 'create', '--metadata', metadata, '--body', body], 'http://127.0.0.1:1')
  const plan = JSON.parse(result.stdout)
  assert.equal(plan.mode, 'dry-run')
  assert.equal(plan.resource, 'prompts')
  assert.deepEqual(plan.fields.sort(), ['body', 'number', 'slug', 'title'])
  assert.ok(!result.stdout.includes('private-prompt-marker'))
  await writeFile(metadata, JSON.stringify({ title: '缺少正文', slug: 'no-body' }))
  await assert.rejects(run(['prompts', 'create', '--metadata', metadata], 'http://127.0.0.1:1'), /正文/)
  await writeFile(metadata, JSON.stringify({ title: '不允许的字段', slug: 'bad-field', body: '正文', html: '<html></html>' }))
  await assert.rejects(run(['prompts', 'create', '--metadata', metadata], 'http://127.0.0.1:1'), /不允许的字段/)
  await assert.rejects(run(['prompts', 'get', 'scene-not-a-prompt'], 'http://127.0.0.1:1'), /题目 ID/)
  await assert.rejects(run(['prompts', 'code', 'prompt-x'], 'http://127.0.0.1:1'), /未知命令/)
  const sceneMetadata = path.join(directory, 'scene.json')
  await writeFile(sceneMetadata, JSON.stringify({ promptId: 'not-a-prompt-id' }))
  await assert.rejects(run(['update', 'scene-test', '--version', '1', '--metadata', sceneMetadata], 'http://127.0.0.1:1'), /promptId/)
})

test('confirmed updates send X-API-Key and the requested If-Match version', async () => {
  let received: { key?: string; version?: string; body?: unknown; method?: string } = {}
  server = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    received = { key: request.headers['x-api-key'] as string, version: request.headers['if-match'], body: JSON.parse(body), method: request.method }
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ scene: { id: 'scene-test', version: 3 } }))
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const metadata = path.join(directory, 'patch.json')
  await writeFile(metadata, JSON.stringify({ notes: '更新记录' }))
  const result = await run(['update', 'scene-test', '--version', '2', '--metadata', metadata, '--confirm'], `http://127.0.0.1:${address.port}`)
  assert.deepEqual(received, { key, version: '"2"', body: { notes: '更新记录' }, method: 'PATCH' })
  assert.ok(!result.stdout.includes(key))
})

test('responses cannot leak the API key into client output', async () => {
  server = createServer((_request, response) => {
    response.writeHead(401, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ error: { message: `echo ${key}` } }))
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  try {
    await run(['list'], `http://127.0.0.1:${address.port}`)
    assert.fail('The request should fail')
  } catch (error) {
    const output = (error as { stderr: string }).stderr
    assert.ok(output.includes('[REDACTED]'))
    assert.ok(!output.includes(key))
  }
})

test('redirects are not followed with credentials', async () => {
  let requests = 0
  server = createServer((_request, response) => {
    requests += 1
    response.writeHead(302, { Location: '/other-target' })
    response.end()
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  await assert.rejects(run(['list'], `http://127.0.0.1:${address.port}`))
  assert.equal(requests, 1)
})
