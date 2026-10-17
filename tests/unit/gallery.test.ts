import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildGalleryEntries, filterGalleryEntries, galleryEntryHref, galleryFilterOptions, sortGalleryEntries } from '../../lib/scenes/gallery'
import { toSceneSummary, type PromptSummary, type SceneSummary } from '../../lib/scenes/model'
import { defaultSceneMetadata } from '../../lib/scenes/schema'

const date = '2026-09-01T00:00:00.000Z'
const prompt = (id: string, values: Partial<PromptSummary> = {}): PromptSummary => ({ id, slug: id, title: '共同题目', number: '', summary: '题目的共同描述', category: '题目分类', tags: ['题目标签'], createdAt: date, updatedAt: date, version: 1, ...values })
const scene = (id: string, values: Partial<SceneSummary> = {}): SceneSummary => ({ ...toSceneSummary({ ...defaultSceneMetadata, id, slug: id, title: '不同实现的标题', renderer: 'html', cover: '', createdAt: date, updatedAt: date, version: 1 }), ...values })

test('one prompt produces one entry and retains every implementation', () => {
  const topic = prompt('prompt-one')
  const first = scene('scene-one', { promptId: topic.id, model: '模型甲', category: '作品自定分类', tags: ['作品标签'] })
  const second = scene('scene-two', { promptId: topic.id, model: '模型乙' })
  const entries = buildGalleryEntries([first, second], [topic])
  assert.equal(entries.length, 1)
  assert.equal(entries[0].prompt?.id, topic.id)
  assert.equal(entries[0].title, topic.title)
  assert.equal(entries[0].summary, topic.summary)
  assert.equal(entries[0].category, topic.category)
  assert.deepEqual(entries[0].tags, topic.tags)
  assert.deepEqual(entries[0].scenes.map(item => item.id).sort(), [first.id, second.id])
  assert.equal(entries[0].matches.length, 2)
})

test('equally titled prompts are grouped by identity rather than title', () => {
  const prompts = [prompt('prompt-one'), prompt('prompt-two')]
  const entries = buildGalleryEntries(prompts.map((item, index) => scene(`scene-${index}`, { promptId: item.id })), prompts)
  assert.equal(entries.length, 2)
  assert.equal(new Set(entries.map(entry => entry.key)).size, 2)
})

test('unlinked scenes and missing prompt references remain separate visible works', () => {
  const scenes = [scene('scene-one'), scene('scene-two'), scene('scene-three', { promptId: 'prompt-missing' })]
  const entries = buildGalleryEntries(scenes, [prompt('prompt-empty')])
  assert.equal(entries.length, 3)
  assert.ok(entries.every(entry => !entry.prompt && entry.scenes.length === 1))
  assert.equal(galleryEntryHref(entries[0]), '/scenes/scene-one')
  assert.deepEqual(buildGalleryEntries([], [prompt('prompt-empty')]), [])
})

test('the most recently updated matching implementation with a cover represents its prompt', () => {
  const topic = prompt('prompt-one')
  const old = scene('scene-old', { promptId: topic.id, cover: '/old.webp', updatedAt: '2026-09-02' })
  const edited = scene('scene-edited', { promptId: topic.id, cover: '/edited.webp', updatedAt: '2026-09-12' })
  const noCover = scene('scene-no-cover', { promptId: topic.id, updatedAt: '2026-09-20' })
  const entry = buildGalleryEntries([old, noCover, edited], [topic])[0]
  assert.equal(entry.coverScene.id, edited.id)
  assert.equal(galleryEntryHref(entry), '/prompts/prompt-one?compare=scene-edited')
})

test('cover selection is stable on equal dates and never mutates input arrays', () => {
  const topic = Object.freeze(prompt('prompt-one'))
  const scenes = Object.freeze([Object.freeze(scene('scene-b', { promptId: topic.id, cover: '/b.webp' })), Object.freeze(scene('scene-a', { promptId: topic.id, cover: '/a.webp' }))])
  const entries = buildGalleryEntries(scenes, Object.freeze([topic]))
  assert.equal(entries[0].coverScene.id, 'scene-a')
  assert.deepEqual(scenes.map(item => item.id), ['scene-b', 'scene-a'])
  assert.deepEqual(sortGalleryEntries(entries, 'newest').map(item => item.key), entries.map(item => item.key))
})

test('model and agent filters must match the same implementation', () => {
  const topic = prompt('prompt-one')
  const entries = buildGalleryEntries([
    scene('scene-a', { promptId: topic.id, model: '模型甲', agent: 'Agent 甲' }),
    scene('scene-b', { promptId: topic.id, model: '模型乙', agent: 'Agent 乙' }),
  ], [topic])
  assert.equal(filterGalleryEntries(entries, { model: '模型甲', agent: 'Agent 乙' }).length, 0)
  const [match] = filterGalleryEntries(entries, { model: '模型乙', agent: 'Agent 乙' })
  assert.equal(match.matches.length, 1)
  assert.equal(match.scenes.length, 2)
  assert.equal(match.coverScene.id, 'scene-b')
})

test('filtering does not borrow a cover from an unmatched model', () => {
  const topic = prompt('prompt-one')
  const entries = buildGalleryEntries([
    scene('scene-covered', { promptId: topic.id, model: '模型甲', cover: '/cover.webp' }),
    scene('scene-bare', { promptId: topic.id, model: '模型乙' }),
  ], [topic])
  const [entry] = filterGalleryEntries(entries, { model: '模型乙' })
  assert.equal(entry.coverScene.id, 'scene-bare')
  assert.equal(entry.coverScene.cover, '')
  assert.equal(galleryEntryHref(entry), '/prompts/prompt-one?compare=scene-bare')
})

test('search covers the brief and individual runs while preserving same-run filters', () => {
  const topic = prompt('prompt-one', { summary: '夜间植物观测', tags: ['生态'] })
  const entries = buildGalleryEntries([
    scene('scene-a', { promptId: topic.id, title: '通透玻璃版本', model: 'Model A', agent: 'Agent 甲', subtitle: '绿色花床' }),
    scene('scene-b', { promptId: topic.id, title: '水下版本', model: 'Model B', agent: 'Agent 乙' }),
  ], [topic])
  for (const query of ['观测', '生态', '绿色花床', 'model a']) assert.equal(filterGalleryEntries(entries, { query }).length, 1)
  assert.equal(filterGalleryEntries(entries, { query: '通透玻璃', model: 'Model B' }).length, 0)
  assert.equal(filterGalleryEntries(entries, { query: '生态', model: 'Model B' })[0].coverScene.id, 'scene-b')
})

test('categories come from the prompt and stale prompt filters do not silently show everything', () => {
  const topic = prompt('prompt-one')
  const entries = buildGalleryEntries([scene('scene-one', { promptId: topic.id, category: '作品分类' }), scene('scene-independent', { category: '独立分类' })], [topic])
  assert.equal(filterGalleryEntries(entries, { category: '题目分类' }).length, 1)
  assert.equal(filterGalleryEntries(entries, { category: '作品分类' }).length, 0)
  assert.equal(filterGalleryEntries(entries, { promptSlug: 'prompt-missing' }).length, 0)
  assert.equal(filterGalleryEntries(entries, { promptSlug: topic.slug }).length, 1)
})

test('filter option counts count topics once even when a model has multiple runs', () => {
  const first = prompt('prompt-one'), second = prompt('prompt-two')
  const entries = buildGalleryEntries([
    scene('scene-a', { promptId: first.id, model: '模型甲', agent: 'Agent 甲' }),
    scene('scene-b', { promptId: first.id, model: '模型甲', agent: 'Agent 甲' }),
    scene('scene-c', { promptId: second.id, model: '模型甲', agent: 'Agent 乙' }),
  ], [first, second])
  assert.deepEqual(galleryFilterOptions(entries, 'model', '全部模型'), [{ value: '', label: '全部模型' }, { value: '模型甲', label: '模型甲 (2)' }])
  assert.deepEqual(galleryFilterOptions(entries, 'category', '全部分类'), [{ value: '', label: '全部分类' }, { value: '题目分类', label: '题目分类 (2)' }])
  assert.equal(galleryFilterOptions(entries, 'agent', '全部 Agent').length, 3)
})

test('date sorting uses the matching runs rather than prompt creation or hidden runs', () => {
  const first = prompt('prompt-one', { title: '乙题' }), second = prompt('prompt-two', { title: '甲题' })
  const entries = buildGalleryEntries([
    scene('scene-a', { promptId: first.id, model: '模型甲', createdAt: '2026-09-01' }),
    scene('scene-b', { promptId: first.id, model: '模型乙', createdAt: '2026-09-20' }),
    scene('scene-c', { promptId: second.id, model: '模型甲', createdAt: '2026-09-10' }),
  ], [first, second])
  assert.deepEqual(sortGalleryEntries(entries, 'newest').map(item => item.title), ['乙题', '甲题'])
  assert.deepEqual(sortGalleryEntries(entries, 'oldest').map(item => item.title), ['乙题', '甲题'])
  assert.deepEqual(sortGalleryEntries(entries, 'title').map(item => item.title), ['甲题', '乙题'])
  assert.deepEqual(sortGalleryEntries(entries, 'prompt').map(item => item.title), ['甲题', '乙题'])
  assert.deepEqual(sortGalleryEntries(filterGalleryEntries(entries, { model: '模型甲' }), 'newest').map(item => item.title), ['甲题', '乙题'])
})

test('many implementations of one prompt do not consume multiple gallery slots', () => {
  const topic = prompt('prompt-one')
  const entries = buildGalleryEntries(Array.from({ length: 25 }, (_, index) => scene(`scene-${index}`, { promptId: topic.id })), [topic])
  assert.equal(entries.length, 1)
  assert.equal(entries[0].scenes.length, 25)
})
