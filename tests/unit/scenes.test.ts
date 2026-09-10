import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findScene, formatSceneDate, rainyKonbini, scenes } from '../../lib/scenes/catalog'
import { createDraft, MAX_HTML_BYTES, sceneDraftSchema, validateHtml } from '../../lib/scenes/draft'

const html = '<!doctype html><html lang="zh-CN"><body>场景</body></html>'

test('catalog entries have unique identifiers and valid lookup routes', () => {
  assert.equal(new Set(scenes.map((scene) => scene.id)).size, scenes.length)
  assert.equal(new Set(scenes.map((scene) => scene.slug)).size, scenes.length)
  assert.equal(findScene(rainyKonbini.slug), rainyKonbini)
  assert.equal(findScene('missing-scene'), undefined)
  assert.equal(formatSceneDate('2026-09-10'), '2026年9月10日')
})

test('built-in scene metadata can be exported as a draft', () => {
  const draft = sceneDraftSchema.parse(createDraft(rainyKonbini))
  assert.equal(draft.renderer, 'rainy-konbini')
  assert.equal(draft.prompt, rainyKonbini.prompt)
  assert.equal(draft.cover, rainyKonbini.cover)
  assert.deepEqual(draft.parameters, {})
})

test('editing draft tags does not mutate the source scene', () => {
  const scene = { ...rainyKonbini, tags: ['雨夜'] }
  const draft = createDraft(scene)
  draft.tags.push('新标签')
  assert.deepEqual(scene.tags, ['雨夜'])
})

test('new drafts are empty HTML scenes and cannot export without required fields', () => {
  const draft = createDraft()
  assert.equal(draft.renderer, 'html')
  assert.equal(draft.html, '')
  assert.equal(sceneDraftSchema.safeParse(draft).success, false)
})

test('draft schema rejects unknown fields and invalid slugs', () => {
  const draft = createDraft(rainyKonbini)
  assert.equal(sceneDraftSchema.safeParse({ ...draft, published: true }).success, false)
  for (const slug of ['../scene', 'Scene Name', '场景', 'bad--slug']) {
    assert.equal(sceneDraftSchema.safeParse({ ...draft, slug }).success, false)
  }
})

test('draft schema accepts JSON records but not arrays or non-JSON parameters', () => {
  const draft = createDraft(rainyKonbini)
  assert.equal(sceneDraftSchema.safeParse({ ...draft, parameters: { seed: 42, lighting: { bloom: true } } }).success, true)
  assert.equal(sceneDraftSchema.safeParse({ ...draft, parameters: [] }).success, false)
  assert.equal(sceneDraftSchema.safeParse({ ...draft, parameters: { seed: Infinity } }).success, false)
})

test('draft covers exclude remote URLs and executable image formats', () => {
  const draft = createDraft(rainyKonbini)
  for (const cover of ['https://example.com/cover.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)']) {
    assert.equal(sceneDraftSchema.safeParse({ ...draft, cover }).success, false)
  }
})

test('HTML validation requires a full document', () => {
  assert.equal(validateHtml(html), null)
  assert.ok(validateHtml('   '))
  assert.ok(validateHtml('<div>片段</div>'))
  assert.ok(validateHtml('<html><body>未关闭'))
})

test('HTML size limits measure UTF-8 bytes instead of string length', () => {
  const source = `<html>${'雨'.repeat(Math.ceil(MAX_HTML_BYTES / 3))}</html>`
  assert.ok(source.length < MAX_HTML_BYTES)
  assert.ok(validateHtml(source))
})
