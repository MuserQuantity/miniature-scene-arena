import { expect, test, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { testApiKey } from './settings'

const auth = { 'X-API-Key': testApiKey }
const execute = promisify(execFile)
const html = (label: string) => `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"></head><body style="background:#14232f;color:#e6edef;font:18px system-ui;padding:24px"><h1>${label}</h1></body></html>`

async function createPrompt(request: APIRequestContext, extra = {}) {
  const response = await request.post('/api/v1/prompts', { headers: auth, data: { title: '对比测试题目', slug: `prompt-test-${randomUUID()}`, number: '99', category: '对比分类', tags: ['对比'], body: '# 99 对比测试题目\n\n请制作一个 **可交互** 的场景。\n\n- 要求一\n- 要求二', ...extra } })
  expect(response.status()).toBe(201)
  expect(response.headers().etag).toBe('"1"')
  return (await response.json()).prompt
}

async function createRun(request: APIRequestContext, promptId: string, model: string, agent: string, extra = {}) {
  const response = await request.post('/api/v1/scenes', { headers: auth, data: { title: '对比测试作品', slug: `run-${randomUUID()}`, promptId, model, agent, thinking: 'max', html: html(`${model} 版本`), ...extra } })
  expect(response.status()).toBe(201)
  return (await response.json()).scene
}

test('prompt endpoints require the key, validate references and expose linked runs', async ({ request }) => {
  expect((await request.get('/api/v1/prompts')).status()).toBe(401)
  expect((await request.post('/api/v1/prompts', { data: { title: '匿名', slug: 'anonymous-prompt', body: '正文' } })).status()).toBe(401)
  const prompt = await createPrompt(request)
  expect((await request.post('/api/v1/prompts', { headers: auth, data: { title: '重复地址', slug: prompt.slug, body: '正文' } })).status()).toBe(409)
  expect((await request.post('/api/v1/prompts', { headers: auth, data: { title: '缺正文', slug: `prompt-${randomUUID()}` } })).status()).toBe(422)
  expect((await request.post('/api/v1/scenes', { headers: auth, data: { title: '孤儿作品', slug: `orphan-${randomUUID()}`, promptId: 'prompt-missing', html: html('x') } })).status()).toBe(422)
  const run = await createRun(request, prompt.id, '模型甲', 'Agent 甲')
  expect(run.category).toBe('对比分类')
  expect(run.tags).toEqual(['对比'])
  const detail = await request.get(`/api/v1/prompts/${prompt.id}`, { headers: auth })
  expect(detail.status()).toBe(200)
  const body = await detail.json()
  expect(body.prompt.slug).toBe(prompt.slug)
  expect(body.scenes.map((scene: { id: string }) => scene.id)).toEqual([run.id])
  expect((await request.patch(`/api/v1/prompts/${prompt.id}`, { headers: auth, data: { summary: '缺少版本' } })).status()).toBe(428)
  const updated = await request.patch(`/api/v1/prompts/${prompt.id}`, { headers: { ...auth, 'If-Match': '"1"' }, data: { summary: '更新后的摘要' } })
  expect(updated.status()).toBe(200)
  expect((await updated.json()).prompt.version).toBe(2)
  expect((await request.patch(`/api/v1/prompts/${prompt.id}`, { headers: { ...auth, 'If-Match': '"1"' }, data: { summary: '过期' } })).status()).toBe(412)
  expect((await request.patch(`/api/v1/prompts/${prompt.id}`, { headers: { ...auth, 'If-Match': '"2"' }, data: { slug: 'changed' } })).status()).toBe(422)
  const scenes = (await (await request.get('/api/v1/scenes', { headers: auth })).json()).scenes
  expect(scenes.find((scene: { id: string }) => scene.id === run.id).promptId).toBe(prompt.id)
})

test('the prompt matrix, comparison view and sibling strip connect runs of one prompt', async ({ page, request }, testInfo) => {
  const prompt = await createPrompt(request, { title: `矩阵题目 ${randomUUID().slice(0, 6)}` })
  const first = await createRun(request, prompt.id, '模型甲', 'Agent 甲')
  const second = await createRun(request, prompt.id, '模型乙', 'Agent 乙')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/prompts')
  const row = page.getByRole('row', { name: new RegExp(prompt.title) })
  await expect(row).toBeVisible()
  await expect(row.getByRole('link', { name: /模型甲 · Agent 甲/ })).toBeVisible()
  await expect(row.getByRole('link', { name: /模型乙 · Agent 乙/ })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /模型甲/ })).toBeVisible()
  await row.getByRole('link', { name: prompt.title }).click()
  await expect(page).toHaveURL(`/prompts/${prompt.slug}`)
  await expect(page.getByRole('heading', { name: prompt.title, level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: '99 对比测试题目' })).toBeVisible()
  await expect(page.getByText('要求一')).toBeVisible()

  await page.getByRole('button', { name: '对比前 2 个' }).click()
  await expect(page).toHaveURL(/compare=/)
  await expect(page.locator('iframe')).toHaveCount(2)
  await expect(page.frameLocator('iframe').first().getByRole('heading', { name: /版本/ })).toBeVisible()
  await expect(page.frameLocator('iframe').nth(1).getByRole('heading', { name: /版本/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('prompt-compare.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '移出对比' }).first().click()
  await expect(page.locator('iframe')).toHaveCount(1)
  await page.getByRole('button', { name: '清空' }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page).not.toHaveURL(/compare=/)

  await page.goto(`/scenes/${first.slug}`)
  await expect(page.getByRole('link', { name: `题目 99 · ${prompt.title}` })).toBeVisible()
  const siblings = page.getByRole('region', { name: '同题作品' })
  await expect(siblings.getByText('模型乙')).toBeVisible()
  await expect(siblings.getByRole('link', { name: '并排对比' })).toHaveAttribute('href', `/prompts/${prompt.slug}?compare=${first.slug},${second.slug}`)
  await page.getByRole('link', { name: '查看题目原文' }).click()
  await expect(page).toHaveURL(`/prompts/${prompt.slug}`)

  await page.goto(`/?prompt=${prompt.slug}`)
  await expect(page.getByText(`题目：99 ${prompt.title}`)).toBeVisible()
  await expect(page.getByRole('link', { name: /进入题目/ })).toHaveCount(1)
  await expect(page.getByRole('link', { name: '查看 2 个实现' })).toBeVisible()
  expect(errors).toEqual([])
})

test('gallery groups implementations into one prompt card and opens the matching version', async ({ page, request }) => {
  const prompt = await createPrompt(request, { title: `聚合题目 ${randomUUID().slice(0, 6)}`, number: '', category: '聚合回归', summary: '一张卡片汇集同题实现' })
  const first = await createRun(request, prompt.id, '聚合模型甲', '聚合 Agent 甲')
  const second = await createRun(request, prompt.id, '聚合模型乙', '聚合 Agent 乙')
  const collection = page.getByRole('region', { name: '场景作品集' })
  await page.goto(`/?prompt=${prompt.slug}`)
  await expect(collection.getByRole('article')).toHaveCount(1)
  await expect(collection.getByRole('heading', { name: prompt.title })).toBeVisible()
  await expect(collection.getByText('2 个实现', { exact: true }).first()).toBeVisible()
  await expect(collection.getByRole('link', { name: `进入题目：${prompt.title}` })).toHaveAttribute('href', `/prompts/${prompt.slug}?compare=${second.slug}`)
  await page.getByRole('combobox', { name: '按创作模型筛选' }).click()
  await page.getByRole('option', { name: /^聚合模型甲/ }).click()
  await expect(collection.getByRole('article')).toHaveCount(1)
  await expect(collection.getByText('匹配 1 / 2 个实现', { exact: true })).toBeVisible()
  await collection.getByRole('link', { name: `进入题目：${prompt.title}` }).click()
  await expect(page).toHaveURL(`/prompts/${prompt.slug}?compare=${first.slug}`)
  await expect(page.locator('iframe')).toHaveCount(1)
  await expect(page.frameLocator('iframe').getByRole('heading', { name: '聚合模型甲 版本' })).toBeVisible()
  await expect(page.getByRole('region', { name: '题目实现' }).getByText('聚合模型乙', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/model=/)
  await expect(collection.getByRole('article')).toHaveCount(1)
  await expect(collection.getByText('匹配 1 / 2 个实现', { exact: true })).toBeVisible()
  const incompatible = new URLSearchParams({ prompt: prompt.slug, model: '聚合模型甲', agent: '聚合 Agent 乙' })
  await page.goto(`/?${incompatible}`)
  await expect(page.getByText('还没有找到这个世界')).toBeVisible()
})

test('topic pagination counts prompts, preserves back navigation, and keeps mobile cards within the viewport', async ({ page, request }, testInfo) => {
  const category = `题目分页 ${randomUUID().slice(0, 6)}`
  for (let index = 0; index < 13; index++) {
    const prompt = await createPrompt(request, { title: `分页主题 ${index}`, number: '', category })
    await createRun(request, prompt.id, '分页模型', '分页 Agent 甲')
    await createRun(request, prompt.id, '分页模型', '分页 Agent 乙')
  }
  await createPrompt(request, { title: '暂未实现的题目', number: '', category })
  await page.goto(`/?category=${encodeURIComponent(category)}`)
  const collection = page.getByRole('region', { name: '场景作品集' })
  await expect(collection.getByRole('article')).toHaveCount(12)
  await expect(collection.locator('[aria-live="polite"]')).toContainText('13 道题')
  await expect(collection.locator('[aria-live="polite"]')).toContainText('26 个匹配实现')
  expect(new Set(await collection.locator('article h2').allTextContents()).size).toBe(12)
  await page.getByRole('combobox', { name: '按创作模型筛选' }).click()
  await expect(page.getByRole('option', { name: '分页模型 (13)', exact: true })).toBeVisible()
  await page.getByRole('option', { name: '分页模型 (13)', exact: true }).click()
  await collection.getByRole('navigation', { name: '分页' }).first().getByRole('button', { name: '下一页' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(collection.getByRole('article')).toHaveCount(1)
  await page.getByRole('button', { name: '大图视图' }).click()
  await expect(collection.getByRole('article')).toHaveCount(12)
  await expect(page).not.toHaveURL(/page=2/)
  await page.goBack()
  await expect(page).toHaveURL(/page=2/)
  await expect(collection.getByRole('article')).toHaveCount(1)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('topic-gallery-mobile.png'), fullPage: true, animations: 'disabled' })
  await page.goto('/?prompt=prompt-not-present')
  await expect(page.getByText('题目：未找到的题目')).toBeVisible()
  await expect(page.getByText('还没有找到这个世界')).toBeVisible()
})

test('deleting prompts requires authorization, exact versions and an explicit complete run set', async ({ request }) => {
  const prompt = await createPrompt(request, { title: '删除权限验证', number: '' })
  const run = await createRun(request, prompt.id, '删除测试模型', '删除测试 Agent')
  const url = `/api/v1/prompts/${prompt.id}`
  const data = { scenes: [{ id: run.id, version: run.version }] }
  expect((await request.delete(url, { data })).status()).toBe(401)
  expect((await request.delete(url, { headers: { 'X-API-Key': 'incorrect-test-key-value-not-for-production', 'If-Match': '"1"' }, data })).status()).toBe(401)
  expect((await request.delete(url, { headers: auth, data })).status()).toBe(428)
  expect((await request.delete(url, { headers: { ...auth, 'If-Match': '*' }, data })).status()).toBe(400)
  expect((await request.delete(url, { headers: { ...auth, 'If-Match': '"2"' }, data })).status()).toBe(412)
  const headers = { ...auth, 'If-Match': '"1"' }
  expect((await request.delete(url, { headers: { ...headers, 'Content-Type': 'text/plain' }, data: '{}' })).status()).toBe(415)
  expect((await request.delete(url, { headers, data: {} })).status()).toBe(409)
  expect((await request.delete(url, { headers, data: { all: true } })).status()).toBe(422)
  expect((await request.delete(url, { headers, data: { scenes: [{ id: run.id, version: run.version }, { id: run.id, version: run.version }] } })).status()).toBe(422)
  expect((await request.delete(url, { headers, data: { scenes: [{ id: run.id, version: 99 }] } })).status()).toBe(412)
  expect((await request.get(url, { headers: auth })).status()).toBe(200)
  expect((await request.get(`/api/v1/scenes/${run.id}`, { headers: auth })).status()).toBe(200)
})

test('confirmed prompt deletion removes its public entries without deleting unrelated records', async ({ page, request }) => {
  const prompt = await createPrompt(request, { title: `删除题目 ${randomUUID().slice(0, 6)}`, number: '' })
  const cover = `data:image/png;base64,${(await sharp({ create: { width: 12, height: 8, channels: 3, background: '#87ada9' } }).png().toBuffer()).toString('base64')}`
  const first = await createRun(request, prompt.id, '删除模型甲', '删除 Agent 甲', { cover })
  const second = await createRun(request, prompt.id, '删除模型乙', '删除 Agent 乙')
  const retainedPrompt = await createPrompt(request, { title: '仍须保留的题目', number: '' })
  const retainedScene = await createRun(request, retainedPrompt.id, '保留模型', '保留 Agent')
  const url = `/api/v1/prompts/${prompt.id}`, headers = { ...auth, 'If-Match': '"1"' }
  expect((await request.get(first.cover)).status()).toBe(200)
  expect((await request.get(`/scenes/${first.slug}/render`)).status()).toBe(200)
  const oldPlan = { scenes: [first, second].map(({ id, version }) => ({ id, version })) }
  const third = await createRun(request, prompt.id, '后来新增模型', '后来新增 Agent')
  const conflict = await request.delete(url, { headers, data: oldPlan })
  expect(conflict.status()).toBe(412)
  expect((await conflict.json()).error.code).toBe('SCENE_SET_CHANGED')
  const runs = [first, second, third]
  const deleted = await request.delete(url, { headers, data: { scenes: runs.map(({ id, version }) => ({ id, version })) } })
  expect(deleted.status()).toBe(200)
  expect(deleted.headers()['cache-control']).toBe('no-store')
  const result = await deleted.json()
  expect(result.deletedPrompt.id).toBe(prompt.id)
  expect(result.deletedScenes.map((scene: { id: string }) => scene.id).sort()).toEqual(runs.map(scene => scene.id).sort())
  expect(result.assetsRetained).toBe(true)
  expect((await request.get(url, { headers: auth })).status()).toBe(404)
  expect((await request.get(`/prompts/${prompt.slug}`)).status()).toBe(404)
  for (const run of runs) {
    expect((await request.get(`/api/v1/scenes/${run.id}`, { headers: auth })).status()).toBe(404)
    expect((await request.get(`/api/v1/scenes/${run.id}/code`, { headers: auth })).status()).toBe(404)
    for (const suffix of ['', '/play', '/render']) expect((await request.get(`/scenes/${run.slug}${suffix}`)).status()).toBe(404)
  }
  expect((await request.get(first.cover)).status()).toBe(404)
  expect((await (await request.get(`/api/v1/prompts/${retainedPrompt.id}`, { headers: auth })).json()).prompt).toEqual(retainedPrompt)
  expect((await (await request.get(`/api/v1/scenes/${retainedScene.id}`, { headers: auth })).json()).scene).toEqual(retainedScene)
  await page.goto('/prompts')
  await expect(page.getByRole('row', { name: new RegExp(prompt.title) })).toHaveCount(0)
  await page.goto(`/?prompt=${prompt.slug}`)
  await expect(page.getByText('题目：未找到的题目')).toBeVisible()
  await expect(page.getByText('还没有找到这个世界')).toBeVisible()
})

test('the skill client manages prompts and links scenes to them', async ({ request }, testInfo) => {
  const script = path.resolve('.devin/skills/manage-scenes/scripts/scenes.mjs')
  const run = async (args: string[]) => execute(process.execPath, [script, ...args, '--config', testInfo.outputPath('.env')], {
    env: { ...process.env, SCENE_API_KEY: testApiKey, SCENE_API_URL: 'http://127.0.0.1:3100' },
  })
  const slug = `cli-prompt-${randomUUID()}`
  const metadata = testInfo.outputPath('prompt.json')
  const body = testInfo.outputPath('prompt.md')
  await writeFile(metadata, JSON.stringify({ title: 'CLI 题目', slug, number: '42', category: 'CLI 分类' }))
  await writeFile(body, '# 42 CLI 题目\n\n正文内容。')
  const dryRun = JSON.parse((await run(['prompts', 'create', '--metadata', metadata, '--body', body])).stdout)
  expect(dryRun.mode).toBe('dry-run')
  expect(dryRun.resource).toBe('prompts')
  expect(dryRun.bodyBytes).toBeGreaterThan(0)
  const created = JSON.parse((await run(['prompts', 'create', '--metadata', metadata, '--body', body, '--confirm'])).stdout).prompt
  expect(created.slug).toBe(slug)
  expect(created.body).toContain('正文内容')
  const listed = JSON.parse((await run(['prompts', 'list'])).stdout).prompts
  expect(listed.some((prompt: { id: string }) => prompt.id === created.id)).toBe(true)
  const patch = testInfo.outputPath('prompt-patch.json')
  await writeFile(patch, JSON.stringify({ summary: 'CLI 摘要' }))
  const updated = JSON.parse((await run(['prompts', 'update', created.id, '--version', '1', '--metadata', patch, '--confirm'])).stdout).prompt
  expect(updated.version).toBe(2)
  expect(updated.summary).toBe('CLI 摘要')
  const sceneMetadata = testInfo.outputPath('scene.json')
  const source = testInfo.outputPath('scene.html')
  await writeFile(sceneMetadata, JSON.stringify({ title: 'CLI 关联作品', slug: `cli-run-${randomUUID()}`, promptId: created.id, model: 'CLI 模型', agent: 'CLI Agent' }))
  await writeFile(source, html('CLI'))
  const scene = JSON.parse((await run(['create', '--metadata', sceneMetadata, '--html', source, '--confirm'])).stdout).scene
  expect(scene.promptId).toBe(created.id)
  expect(scene.category).toBe('CLI 分类')
  const detail = await request.get(`/api/v1/prompts/${created.id}`, { headers: auth })
  expect((await detail.json()).scenes.map((item: { id: string }) => item.id)).toEqual([scene.id])
  await writeFile(sceneMetadata, JSON.stringify({ promptId: 'prompt-not-real' }))
  await expect(run(['update', scene.id, '--version', '1', '--metadata', sceneMetadata, '--confirm'])).rejects.toThrow(/PROMPT_NOT_FOUND/)
  await writeFile(sceneMetadata, JSON.stringify({ promptId: 'scene-wrong-kind' }))
  await expect(run(['update', scene.id, '--version', '1', '--metadata', sceneMetadata])).rejects.toThrow(/promptId/)
  const deletionPlan = testInfo.outputPath('delete-plan.json')
  await writeFile(deletionPlan, JSON.stringify({ scenes: [{ id: scene.id, version: scene.version }] }))
  const deletionArgs = ['prompts', 'delete', created.id, '--version', String(updated.version), '--metadata', deletionPlan]
  const deletionPreview = JSON.parse((await run(deletionArgs)).stdout)
  expect(deletionPreview.mode).toBe('dry-run')
  expect(deletionPreview.scenes.map((item: { id: string }) => item.id)).toEqual([scene.id])
  expect((await request.get(`/api/v1/prompts/${created.id}`, { headers: auth })).status()).toBe(200)
  const deleted = JSON.parse((await run([...deletionArgs, '--confirm'])).stdout)
  expect(deleted.deletedPrompt.id).toBe(created.id)
  expect(deleted.assetsRetained).toBe(true)
  expect((await request.get(`/api/v1/prompts/${created.id}`, { headers: auth })).status()).toBe(404)
  expect((await request.get(`/api/v1/scenes/${scene.id}`, { headers: auth })).status()).toBe(404)
})
