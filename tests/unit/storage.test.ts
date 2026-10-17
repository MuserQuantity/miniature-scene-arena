import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
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

test('single-scene deletion preserves its prompt, sibling runs and every historical asset', async () => {
  const prompt = await store.createPrompt({ title: '保留题目', slug: 'keep-scene-prompt', body: '题目原文' })
  const cover = `data:image/png;base64,${(await sharp({ create: { width: 8, height: 8, channels: 3, background: '#93b7bf' } }).png().toBuffer()).toString('base64')}`
  const scene = await store.create({ title: '待删除实现', slug: 'delete-single-run', html, cover, promptId: prompt.id })
  const sibling = await store.create({ title: '保留同题实现', slug: 'keep-sibling-run', html, cover, promptId: prompt.id })
  const other = await store.create({ title: '保留独立作品', slug: 'keep-unlinked-run', html })
  const assets = path.join(directory, 'assets')
  const files = (await readdir(assets)).sort()
  const contents = await Promise.all(files.map(file => readFile(path.join(assets, file))))
  const result = await store.deleteScene(scene.id, {}, scene.version)
  assert.deepEqual(result, { deletedScene: { id: scene.id, slug: scene.slug, title: scene.title, version: scene.version, promptId: prompt.id }, assetsRetained: true })
  const reopened = createSceneStore(directory)
  assert.equal(await reopened.get(scene.id), undefined)
  assert.equal(await reopened.findBySlug(scene.slug), undefined)
  await assert.rejects(reopened.readDocument(scene.id), { status: 404 })
  assert.equal(await reopened.readCover(scene.id), undefined)
  assert.equal(await reopened.readCoverForSlug(scene.slug), undefined)
  assert.deepEqual(await reopened.getPrompt(prompt.id), prompt)
  assert.deepEqual(await reopened.get(sibling.id), sibling)
  assert.deepEqual(await reopened.get(other.id), other)
  assert.equal(await reopened.readHtml(sibling.id), html)
  assert.ok(await reopened.readCover(sibling.id))
  assert.deepEqual((await readdir(assets)).sort(), files)
  for (let index = 0; index < files.length; index++) assert.ok((await readFile(path.join(assets, files[index]))).equals(contents[index]))
})

test('single-scene deletion rejects stale versions, missing records and cascade payloads without writing', async () => {
  const scene = await store.create({ title: '待删除作品', slug: 'delete-single-guard', html })
  await store.update(scene.id, { title: '刚刚修改的作品' }, 1)
  const filename = path.join(directory, 'catalog.json')
  const before = await readFile(filename, 'utf8')
  await assert.rejects(store.deleteScene(scene.id, {}, 1), { status: 412, code: 'VERSION_CONFLICT' })
  await assert.rejects(store.deleteScene('scene-missing', {}, 1), { status: 404 })
  for (const input of [{ all: true }, { scenes: [] }, { promptId: 'prompt-delete' }, null, []]) {
    await assert.rejects(store.deleteScene(scene.id, input, 2))
  }
  assert.equal(await readFile(filename, 'utf8'), before)
  await store.deleteScene(scene.id, {}, 2)
  await assert.rejects(store.deleteScene(scene.id, {}, 2), { status: 404 })
})

test('deleting the last run retains an empty prompt', async () => {
  const prompt = await store.createPrompt({ title: '保留空题目', slug: 'keep-empty-prompt', body: '正文' })
  const scene = await store.create({ title: '唯一实现', slug: 'delete-last-run', html, promptId: prompt.id })
  await store.deleteScene(scene.id, {}, 1)
  assert.deepEqual(await store.getPrompt(prompt.id), prompt)
  assert.deepEqual(await store.list(), [])
})

test('concurrent editing and single-scene deletion cannot remove an unreviewed version', async () => {
  const scene = await store.create({ title: '并发删除作品', slug: 'delete-scene-concurrent', html })
  const results = await Promise.allSettled([
    store.deleteScene(scene.id, {}, 1),
    createSceneStore(directory).update(scene.id, { title: '并发修改作品' }, 1),
  ])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  const current = await store.get(scene.id)
  if (current) assert.equal(current.version, 2)
})

test('deleting an empty prompt removes only its record and requires its current version', async () => {
  const prompt = await store.createPrompt({ title: '待删除题目', slug: 'delete-empty', body: '正文' })
  const other = await store.createPrompt({ title: '保留题目', slug: 'keep-prompt', body: '保留正文' })
  await assert.rejects(store.deletePrompt(prompt.id, {}, 2), { status: 412 })
  const result = await store.deletePrompt(prompt.id, {}, 1)
  assert.deepEqual(result.deletedPrompt, { id: prompt.id, slug: prompt.slug, title: prompt.title, version: 1 })
  assert.deepEqual(result.deletedScenes, [])
  assert.equal(result.assetsRetained, true)
  assert.equal(await store.getPrompt(prompt.id), undefined)
  assert.equal(await store.findPromptBySlug(prompt.slug), undefined)
  assert.deepEqual(await store.getPrompt(other.id), other)
  await assert.rejects(store.deletePrompt(prompt.id, {}, 1), { status: 404 })
})

test('prompt deletion atomically removes an explicitly reviewed set of runs but retains every asset', async () => {
  const prompt = await store.createPrompt({ title: '待删除题目', slug: 'delete-with-runs', body: '题目原文' })
  const cover = `data:image/png;base64,${(await sharp({ create: { width: 8, height: 8, channels: 3, background: '#93b7bf' } }).png().toBuffer()).toString('base64')}`
  const first = await store.create({ title: '待删除实现甲', slug: 'delete-run-a', html, cover, promptId: prompt.id })
  const second = await store.create({ title: '待删除实现乙', slug: 'delete-run-b', html: '<html><body>另一个实现</body></html>', promptId: prompt.id })
  const other = await store.create({ title: '保留作品', slug: 'keep-run', html: '<html><body>保留作品</body></html>' })
  const assets = path.join(directory, 'assets')
  const files = (await readdir(assets)).sort()
  const contents = await Promise.all(files.map(file => readFile(path.join(assets, file))))
  await assert.rejects(store.deletePrompt(prompt.id, {}, 1), { status: 409 })
  const result = await store.deletePrompt(prompt.id, { scenes: [first, second].map(({ id, version }) => ({ id, version })) }, 1)
  assert.deepEqual(result.deletedScenes.map(scene => scene.id).sort(), [first.id, second.id].sort())
  const reopened = createSceneStore(directory)
  assert.deepEqual(await reopened.listPrompts(), [])
  assert.deepEqual(await reopened.list(), [other])
  assert.equal(await reopened.findBySlug(first.slug), undefined)
  await assert.rejects(reopened.readDocument(first.id), { status: 404 })
  assert.equal(await reopened.readCover(first.id), undefined)
  assert.deepEqual((await readdir(assets)).sort(), files.sort())
  for (let index = 0; index < files.length; index++) assert.ok((await readFile(path.join(assets, files[index]))).equals(contents[index]))
})

test('changed or mismatched linked-run sets cannot be deleted with an old plan', async () => {
  const prompt = await store.createPrompt({ title: '待删除题目', slug: 'delete-set-check', body: '正文' })
  const first = await store.create({ title: '原有实现', slug: 'delete-set-first', html, promptId: prompt.id })
  const second = await store.create({ title: '后来新增实现', slug: 'delete-set-second', html, promptId: prompt.id })
  const unrelated = await store.create({ title: '其他题目的作品', slug: 'unrelated-run', html })
  const before = await readFile(path.join(directory, 'catalog.json'), 'utf8')
  for (const scenes of [[{ id: first.id, version: 1 }], [{ id: first.id, version: 1 }, { id: unrelated.id, version: 1 }]]) {
    await assert.rejects(store.deletePrompt(prompt.id, { scenes }, 1), { status: 412, code: 'SCENE_SET_CHANGED' })
  }
  assert.equal(await readFile(path.join(directory, 'catalog.json'), 'utf8'), before)
  assert.equal((await store.get(second.id))?.promptId, prompt.id)
})

test('an edited linked run invalidates deletion without changing any other data', async () => {
  const prompt = await store.createPrompt({ title: '待删除题目', slug: 'delete-version-check', body: '正文' })
  const scene = await store.create({ title: '原有实现', slug: 'delete-version-run', html, promptId: prompt.id })
  await store.update(scene.id, { title: '刚刚修改的实现' }, 1)
  await assert.rejects(store.deletePrompt(prompt.id, { scenes: [{ id: scene.id, version: 1 }] }, 1), { status: 412, code: 'SCENE_VERSION_CONFLICT' })
  assert.ok(await store.getPrompt(prompt.id))
  assert.equal((await store.get(scene.id))?.title, '刚刚修改的实现')
})

test('invalid deletion payloads cannot become wildcard or partial cascades', async () => {
  const prompt = await store.createPrompt({ title: '待删除题目', slug: 'delete-validation', body: '正文' })
  const scene = await store.create({ title: '关联实现', slug: 'delete-validation-run', html, promptId: prompt.id })
  for (const input of [{ all: true }, { scenes: 'all' }, { scenes: [{ id: scene.id, version: 0 }] }, { scenes: [{ id: scene.id, version: Number.MAX_SAFE_INTEGER + 1 }] }, { scenes: [{ id: '../bad', version: 1 }] }, { scenes: [{ id: scene.id, version: 1 }, { id: scene.id, version: 1 }] }]) {
    await assert.rejects(store.deletePrompt(prompt.id, input, 1))
  }
  assert.ok(await store.getPrompt(prompt.id))
  assert.ok(await store.get(scene.id))
})

test('concurrent publication and deletion cannot produce an orphan or remove an unreviewed run', async () => {
  const prompt = await store.createPrompt({ title: '并发删除题目', slug: 'delete-concurrent', body: '正文' })
  const first = await store.create({ title: '原有实现', slug: 'delete-concurrent-first', html, promptId: prompt.id })
  const results = await Promise.allSettled([
    store.deletePrompt(prompt.id, { scenes: [{ id: first.id, version: first.version }] }, prompt.version),
    createSceneStore(directory).create({ title: '并发新增实现', slug: 'delete-concurrent-new', html, promptId: prompt.id }),
  ])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  const snapshot = await store.snapshot()
  if (snapshot.prompts.length) assert.equal(snapshot.scenes.length, 2)
  else assert.equal(snapshot.scenes.length, 0)
  assert.ok(snapshot.scenes.every(scene => snapshot.prompts.some(prompt => prompt.id === scene.promptId)))
})

test('deletion preserves legacy overrides and refuses to remove linked legacy data', async () => {
  const prompt = await store.createPrompt({ title: '待删除题目', slug: 'delete-legacy-safe', body: '正文' })
  const filename = path.join(directory, 'catalog.json')
  const catalog = JSON.parse(await readFile(filename, 'utf8'))
  const legacy = { ...defaultSceneMetadata, id: 'scene-001', slug: 'rainy-night-konbini', title: 'Legacy demo', renderer: 'rainy-konbini', cover: '', createdAt: '2026-09-10', updatedAt: '2026-09-10', version: 1, promptId: prompt.id }
  catalog.scenes.push(legacy)
  await writeFile(filename, JSON.stringify(catalog))
  const before = await readFile(filename, 'utf8')
  await assert.rejects(store.deletePrompt(prompt.id, { scenes: [{ id: legacy.id, version: 1 }] }, 1), { status: 409, code: 'LEGACY_LINK_EXISTS' })
  await assert.rejects(store.deleteScene(legacy.id, {}, 1), { status: 404 })
  assert.equal(await readFile(filename, 'utf8'), before)
  legacy.promptId = ''
  await writeFile(filename, JSON.stringify(catalog))
  await store.deletePrompt(prompt.id, {}, 1)
  assert.deepEqual(JSON.parse(await readFile(filename, 'utf8')).scenes, [legacy])
})

test('corrupted storage is never silently replaced with an empty catalog', async () => {
  await writeFile(path.join(directory, 'catalog.json'), 'broken-json')
  await assert.rejects(store.list())
  await assert.rejects(store.create({ slug: 'new-scene', title: '新场景', html }))
  await assert.rejects(store.deletePrompt('prompt-missing', {}, 1), { code: 'STORAGE_INVALID' })
  await assert.rejects(store.deleteScene('scene-missing', {}, 1), { code: 'STORAGE_INVALID' })
  assert.equal(await readFile(path.join(directory, 'catalog.json'), 'utf8'), 'broken-json')
})
