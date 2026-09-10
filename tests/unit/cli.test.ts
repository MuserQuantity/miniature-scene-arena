import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { execFile } from 'node:child_process'
import { createServer, type Server } from 'node:http'
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
