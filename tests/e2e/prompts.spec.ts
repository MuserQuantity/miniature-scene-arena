import { expect, test, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
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

async function createRun(request: APIRequestContext, promptId: string, model: string, agent: string) {
  const response = await request.post('/api/v1/scenes', { headers: auth, data: { title: '对比测试作品', slug: `run-${randomUUID()}`, promptId, model, agent, thinking: 'max', html: html(`${model} 版本`) } })
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
  await expect(page.getByRole('link', { name: /进入作品/ })).toHaveCount(2)
  await expect(page.getByRole('link', { name: '对比 2 个版本' }).first()).toBeVisible()
  expect(errors).toEqual([])
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
})
