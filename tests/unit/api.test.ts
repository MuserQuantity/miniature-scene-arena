import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { expectedSceneVersion, readSceneJson, sceneApi, sceneEtag, sceneJson } from '../../lib/scenes/api'
import { MAX_SCENE_BYTES } from '../../lib/scenes/schema'

const key = 'unit-test-only-scene-api-key-not-for-production'
let previousKey: string | undefined

beforeEach(() => { previousKey = process.env.SCENE_API_KEY; process.env.SCENE_API_KEY = key })
afterEach(() => {
  if (previousKey === undefined) delete process.env.SCENE_API_KEY
  else process.env.SCENE_API_KEY = previousKey
})

function request(body = '{}', extraHeaders: Record<string, string> = {}) {
  return new Request('http://localhost/api/v1/scenes', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, ...extraHeaders }, body,
  })
}

test('missing or incorrect API keys cannot reach the handler', async () => {
  let called = false
  for (const value of ['', 'incorrect']) {
    const response = await sceneApi(request('{}', { 'x-api-key': value }), async () => { called = true; return sceneJson({ ok: true }) })
    assert.equal(response.status, 401)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.ok(!(await response.text()).includes(key))
  }
  assert.equal(called, false)
})

test('an unconfigured or weak server key fails closed', async () => {
  for (const value of ['', 'short']) {
    process.env.SCENE_API_KEY = value
    const response = await sceneApi(request(), async () => sceneJson({ ok: true }))
    assert.equal(response.status, 503)
  }
})

test('valid keys allow JSON requests', async () => {
  const response = await sceneApi(request('{"title":"测试场景"}'), async () => sceneJson(await readSceneJson(request('{"title":"测试场景"}'))))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { title: '测试场景' })
})

test('invalid JSON and incorrect content types return actionable errors', async () => {
  await assert.rejects(readSceneJson(request('invalid-json')), { status: 400 })
  await assert.rejects(readSceneJson(request('{}', { 'content-type': 'text/html' })), { status: 415 })
})

test('size limits apply with and without content-length', async () => {
  await assert.rejects(readSceneJson(request('{}', { 'content-length': String(MAX_SCENE_BYTES + 1) })), { status: 413 })
  await assert.rejects(readSceneJson(request('x'.repeat(MAX_SCENE_BYTES + 1))), { status: 413 })
})

test('the management credential cannot accidentally be published in content', async () => {
  await assert.rejects(readSceneJson(request(JSON.stringify({ notes: key }))), { status: 422 })
})

test('updates require an exact numeric version ETag', () => {
  assert.equal(sceneEtag(3), '"3"')
  assert.equal(expectedSceneVersion(request('{}', { 'if-match': '"3"' })), 3)
  assert.throws(() => expectedSceneVersion(request()), { status: 428 })
  assert.throws(() => expectedSceneVersion(request('{}', { 'if-match': '*' })), { status: 400 })
  assert.throws(() => expectedSceneVersion(request('{}', { 'if-match': '"9007199254740993"' })), { status: 400 })
})

test('unexpected errors do not leak internal paths or exception messages', async () => {
  const response = await sceneApi(request(), async () => { throw new Error('sensitive internal detail') })
  assert.equal(response.status, 500)
  assert.ok(!(await response.text()).includes('sensitive internal detail'))
})
