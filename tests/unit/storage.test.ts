import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createSceneStore } from '../../lib/scenes/store'
import { defaultSceneMetadata } from '../../lib/scenes/schema'

const html = '<!doctype html><html lang="zh-CN"><body><h1>新场景</h1></body></html>'
let directory: string
let store: ReturnType<typeof createSceneStore>

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'scene-storage-'))
  store = createSceneStore(directory)
})
afterEach(async () => { await rm(directory, { recursive: true, force: true }) })

test('a fresh volume starts empty without injected demo records', async () => {
  assert.deepEqual(await store.list(), [])
  assert.equal(await store.get('missing'), undefined)
})

test('new HTML scenes survive reopening the store and keep assets out of metadata', async () => {
  const scene = await store.create({ slug: 'new-world', title: '新世界', html, prompt: '创建新世界' })
  assert.equal(scene.renderer, 'html')
  assert.equal(scene.version, 1)
  assert.equal(scene.cover, '')
  assert.equal((await createSceneStore(directory).findBySlug('new-world'))?.id, scene.id)
  assert.equal(await store.readHtml(scene.id), html)
  assert.equal((await store.list()).length, 1)
  assert.ok(!(await readFile(path.join(directory, 'catalog.json'), 'utf8')).includes('<!doctype'))
  assert.ok(!('htmlAsset' in scene))
})

test('partial updates preserve fields and reject stale versions', async () => {
  const scene = await store.create({ slug: 'updates', title: '初始标题', html, tags: ['建筑'], model: 'Test Model', parameters: { seed: 42 } })
  const updated = await store.update(scene.id, { title: '新标题' }, 1)
  assert.equal(updated.version, 2)
  assert.equal(updated.model, 'Test Model')
  assert.deepEqual(updated.tags, ['建筑'])
  assert.deepEqual(updated.parameters, { seed: 42 })
  assert.equal(await store.readHtml(scene.id), html)
  await assert.rejects(store.update(scene.id, { title: '过期修改' }, 1), { status: 412 })
  assert.equal((await store.get(scene.id))?.title, '新标题')
})

test('updates can replace HTML without changing stable IDs or URLs', async () => {
  const scene = await store.create({ slug: 'stable-url', title: '稳定地址', html })
  const replacement = '<html><body>更新后的场景</body></html>'
  const updated = await store.update(scene.id, { html: replacement }, 1)
  assert.equal(updated.id, scene.id)
  assert.equal(updated.slug, 'stable-url')
  assert.equal(await store.readHtml(scene.id), replacement)
  await assert.rejects(store.update(scene.id, { slug: 'changed' }, 2))
  await assert.rejects(store.update(scene.id, { renderer: 'other' }, 2))
})

test('duplicate slugs are rejected under concurrent creation', async () => {
  const results = await Promise.allSettled([
    store.create({ slug: 'same-slug', title: '第一份', html }),
    createSceneStore(directory).create({ slug: 'same-slug', title: '第二份', html }),
  ])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal((await store.list()).length, 1)
})

test('concurrent editors cannot silently overwrite each other', async () => {
  const scene = await store.create({ slug: 'concurrent', title: '并发修改', html })
  const results = await Promise.allSettled([
    store.update(scene.id, { title: '修改甲' }, 1),
    createSceneStore(directory).update(scene.id, { title: '修改乙' }, 1),
  ])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal((await store.get(scene.id))?.version, 2)
})

test('legacy demo overrides stay hidden without erasing them or real scenes', async () => {
  const real = await store.create({ slug: 'real-scene', title: '正式场景', html })
  const filename = path.join(directory, 'catalog.json')
  const catalog = JSON.parse(await readFile(filename, 'utf8'))
  const legacy = { ...defaultSceneMetadata, id: 'scene-001', slug: 'rainy-night-konbini', title: 'Legacy demo', renderer: 'rainy-konbini', cover: '', createdAt: '2026-09-10', updatedAt: '2026-09-10', version: 1 }
  catalog.scenes.push(legacy)
  await writeFile(filename, JSON.stringify(catalog))
  assert.deepEqual((await store.list()).map((scene) => scene.id), [real.id])
  assert.equal(await store.get(legacy.id), undefined)
  assert.equal(await store.findBySlug(legacy.slug), undefined)
  await assert.rejects(store.readHtml(legacy.id), { status: 404 })
  await assert.rejects(store.update(legacy.id, { notes: '不应修改' }, 1), { status: 404 })
  await store.update(real.id, { title: '正式场景更新' }, 1)
  const persisted = JSON.parse(await readFile(filename, 'utf8'))
  assert.deepEqual(persisted.scenes.find((scene: { id: string }) => scene.id === legacy.id), legacy)
  const replacement = await store.create({ slug: legacy.slug, title: '重新收录的正式作品', html })
  assert.equal((await store.findBySlug(legacy.slug))?.id, replacement.id)
})

test('covers are decoded and normalized to WebP', async () => {
  const image = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#94c9c5' } }).png().toBuffer()
  const cover = `data:image/png;base64,${image.toString('base64')}`
  const scene = await store.create({ slug: 'with-cover', title: '自带封面', html, cover })
  assert.match(scene.cover, /^\/scenes\/with-cover\/cover\/[a-f0-9]{64}\.webp$/)
  const stored = await store.readCover(scene.id)
  assert.ok(stored)
  assert.equal((await sharp(stored).metadata()).format, 'webp')
  const edited = await store.update(scene.id, { title: '更新资料' }, 1)
  assert.equal(edited.cover, scene.cover)
  assert.equal(await store.readCoverForSlug(scene.slug, '../.env'), undefined)
  const cleared = await store.update(scene.id, { cover: '' }, 2)
  assert.equal(cleared.cover, '')
  assert.equal(await store.readCover(scene.id), undefined)
})

test('invalid images do not publish a half-created scene', async () => {
  await assert.rejects(store.create({ slug: 'broken-cover', title: '损坏封面', html, cover: 'data:image/png;base64,YmFk' }), { status: 422 })
  assert.equal((await store.list()).length, 0)
})

test('prompts group scenes, inherit category and reject unknown references', async () => {
  const prompt = await store.createPrompt({ slug: 'sakura-station', title: '樱花铁路小站', number: '01', category: '旅途驿站', tags: ['春日'], body: '# 01 樱花铁路小站\n\n请制作场景。' })
  assert.match(prompt.id, /^prompt-[a-f0-9-]+$/)
  assert.equal(prompt.version, 1)
  await assert.rejects(store.createPrompt({ slug: 'sakura-station', title: '重复地址', body: '正文' }), { status: 409 })
  await assert.rejects(store.createPrompt({ slug: 'empty-body', title: '缺少正文', body: '  ' }))
  await assert.rejects(store.create({ slug: 'orphan', title: '引用不存在的题目', html, promptId: 'prompt-missing' }), { status: 422 })
  const first = await store.create({ slug: 'sakura-gpt', title: '樱花铁路小站', html, promptId: prompt.id, model: 'GPT', agent: 'Devin CLI' })
  assert.equal(first.category, '旅途驿站')
  assert.deepEqual(first.tags, ['春日'])
  const second = await store.create({ slug: 'sakura-opus', title: '樱花铁路小站', html, promptId: prompt.id, category: '自定分类', model: 'Opus', agent: 'Claude Code' })
  assert.equal(second.category, '自定分类')
  const snapshot = await store.snapshot()
  assert.deepEqual(snapshot.prompts.map((record) => record.id), [prompt.id])
  assert.deepEqual(snapshot.scenes.filter((scene) => scene.promptId === prompt.id).map((scene) => scene.slug).sort(), ['sakura-gpt', 'sakura-opus'])
  assert.equal((await store.findPromptBySlug('sakura-station'))?.id, prompt.id)
  const updated = await store.updatePrompt(prompt.id, { summary: '春日车站', tags: ['春日', '铁路'] }, 1)
  assert.equal(updated.version, 2)
  assert.equal(updated.body, prompt.body)
  await assert.rejects(store.updatePrompt(prompt.id, { title: '过期' }, 1), { status: 412 })
  await assert.rejects(store.updatePrompt(prompt.id, { slug: 'changed' }, 2))
  await assert.rejects(store.update(first.id, { promptId: 'prompt-missing' }, 1), { status: 422 })
  const detached = await store.update(first.id, { promptId: '' }, 1)
  assert.equal(detached.promptId, '')
  assert.equal((await store.get(second.id))?.promptId, prompt.id)
})

test('version 1 catalogs without prompts stay readable and are upgraded in place', async () => {
  const scene = await store.create({ slug: 'legacy-scene', title: '旧格式场景', html })
  const filename = path.join(directory, 'catalog.json')
  const catalog = JSON.parse(await readFile(filename, 'utf8'))
  delete catalog.prompts
  catalog.formatVersion = 1
  for (const record of catalog.scenes) delete record.promptId
  await writeFile(filename, JSON.stringify(catalog))
  assert.equal((await store.get(scene.id))?.promptId, '')
  assert.deepEqual(await store.listPrompts(), [])
  const prompt = await store.createPrompt({ slug: 'first-prompt', title: '第一个题目', body: '正文' })
  const persisted = JSON.parse(await readFile(filename, 'utf8'))
  assert.equal(persisted.formatVersion, 2)
  assert.equal(persisted.scenes.length, 1)
  assert.equal(persisted.prompts[0].id, prompt.id)
  assert.equal(persisted.scenes[0].id, scene.id)
  assert.equal(persisted.scenes[0].version, 1)
  assert.equal((await store.get(scene.id))?.title, '旧格式场景')
})

test('corrupted storage is never silently replaced with an empty catalog', async () => {
  await writeFile(path.join(directory, 'catalog.json'), 'broken-json')
  await assert.rejects(store.list())
  await assert.rejects(store.create({ slug: 'new-scene', title: '新场景', html }))
  assert.equal(await readFile(path.join(directory, 'catalog.json'), 'utf8'), 'broken-json')
})
