import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatSceneDate } from '../../lib/scenes/model'
import { createSceneSchema, defaultSceneMetadata, MAX_HTML_BYTES, sceneRecordSchema, updateSceneSchema, validateHtml } from '../../lib/scenes/schema'
import { hasSceneSandbox, sceneDocumentResponse } from '../../lib/scenes/sandbox'

const html = '<!doctype html><html lang="zh-CN"><body>场景</body></html>'
const input = { title: '新场景', slug: 'new-scene', html }
const fixture = { ...defaultSceneMetadata, id: 'scene-test', title: '正式场景', slug: 'published-scene', renderer: 'html', cover: '', version: 1, createdAt: '2026-09-10', updatedAt: '2026-09-10' }

test('public records accept only HTML scenes and dates remain stable', () => {
  assert.ok(sceneRecordSchema.safeParse(fixture).success)
  assert.equal(sceneRecordSchema.safeParse({ ...fixture, renderer: 'unknown' }).success, false)
  assert.equal(formatSceneDate('2026-09-10'), '2026年9月10日')
  assert.equal(formatSceneDate('2026-09-10T16:00:00.000Z'), '2026年9月10日')
})

test('creation requires a title, stable slug and complete HTML', () => {
  assert.ok(createSceneSchema.safeParse(input).success)
  assert.equal(createSceneSchema.safeParse({ ...input, title: '' }).success, false)
  assert.equal(createSceneSchema.safeParse({ ...input, html: '<div>片段</div>' }).success, false)
  for (const slug of ['../scene', 'Scene Name', '场景', 'bad--slug']) assert.equal(createSceneSchema.safeParse({ ...input, slug }).success, false)
})

test('partial updates do not inject defaults or permit server-managed fields', () => {
  assert.deepEqual(updateSceneSchema.parse({ title: '修改标题' }), { title: '修改标题' })
  assert.equal(updateSceneSchema.safeParse({}).success, false)
  for (const key of ['id', 'slug', 'renderer', 'version', 'createdAt']) assert.equal(updateSceneSchema.safeParse({ [key]: 'forbidden' }).success, false)
  assert.equal(createSceneSchema.safeParse({ ...input, id: 'scene-override' }).success, false)
})

test('metadata supports JSON parameters and de-duplicates tags', () => {
  const parsed = createSceneSchema.parse({ ...input, tags: ['建筑', '建筑'], parameters: { seed: 42, nested: [true, null] } })
  assert.deepEqual(parsed.tags, ['建筑'])
  assert.equal(createSceneSchema.safeParse({ ...input, parameters: [] }).success, false)
  assert.equal(createSceneSchema.safeParse({ ...input, parameters: { seed: Infinity } }).success, false)
})

test('covers do not accept external URLs or executable image formats', () => {
  for (const cover of ['https://example.com/cover.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)']) {
    assert.equal(createSceneSchema.safeParse({ ...input, cover }).success, false)
  }
  assert.ok(updateSceneSchema.safeParse({ cover: '' }).success)
})

test('HTML limits measure UTF-8 bytes', () => {
  assert.equal(validateHtml(html), null)
  assert.ok(validateHtml(' '))
  const source = `<html>${'雨'.repeat(Math.ceil(MAX_HTML_BYTES / 3))}</html>`
  assert.ok(source.length < MAX_HTML_BYTES)
  assert.ok(validateHtml(source))
})

test('public records exclude internal file pointers', () => {
  const record = sceneRecordSchema.parse({ ...fixture, htmlAsset: 'private-file' })
  assert.ok(!('htmlAsset' in record))
})

test('HTML responses preserve the restrictive opaque-origin sandbox', () => {
  const response = sceneDocumentResponse(html)
  const policy = response.headers.get('content-security-policy') ?? ''
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
  assert.ok(hasSceneSandbox(policy))
  assert.ok(policy.includes("frame-ancestors 'self'"))
  assert.ok(!hasSceneSandbox(policy.replace('sandbox allow-scripts', 'sandbox allow-scripts allow-same-origin')))
  assert.ok(!hasSceneSandbox(`connect-src *; ${policy}`))
})
