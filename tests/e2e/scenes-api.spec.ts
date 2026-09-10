import { expect, test, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { testApiKey } from './settings'

const auth = { 'X-API-Key': testApiKey }
const execute = promisify(execFile)
const html = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><style>body{background:#14232f;color:#e6edef;font:18px system-ui;padding:24px}button{padding:12px}</style></head><body><h1>独立场景已运行</h1><canvas width="300" height="120"></canvas><button id="action">点击交互</button><script>const gl=document.querySelector("canvas").getContext("webgl2");document.body.dataset.webgl=String(Boolean(gl));if(gl){gl.clearColor(0.58,0.79,0.77,1);gl.clear(gl.COLOR_BUFFER_BIT);}document.body.dataset.clicked="0";document.querySelector("button").onclick=()=>document.body.dataset.clicked="1";try{void parent.document.body;document.body.dataset.parent="allowed"}catch{document.body.dataset.parent="blocked"}try{void localStorage.length;document.body.dataset.storage="allowed"}catch{document.body.dataset.storage="blocked"}</script></body></html>'

async function createScene(request: APIRequestContext, extra = {}) {
  const response = await request.post('/api/v1/scenes', {
    headers: auth,
    data: { title: '接口测试场景', slug: `api-test-${randomUUID()}`, html, category: '测试分类', model: '测试模型', ...extra },
  })
  expect(response.status()).toBe(201)
  const result = await response.json()
  expect(response.headers().etag).toBe('"1"')
  return result.scene
}

test('management routes reject anonymous and incorrect-key requests', async ({ request }) => {
  for (const endpoint of ['/api/v1/scenes', '/api/v1/scenes/scene-missing', '/api/v1/scenes/scene-missing/code']) {
    expect((await request.get(endpoint)).status()).toBe(401)
    expect((await request.get(endpoint, { headers: { 'X-API-Key': 'incorrect' } })).status()).toBe(401)
  }
  expect((await request.post('/api/v1/scenes', { data: {} })).status()).toBe(401)
  expect((await request.patch('/api/v1/scenes/scene-missing', { data: { title: '不应修改' } })).status()).toBe(401)
  expect((await request.get('/api/v1/scenes', { headers: auth })).status()).toBe(200)
})

test('new scenes appear without rebuilding and run in an opaque-origin iframe', async ({ page, request }, testInfo) => {
  const title = `新增场景 ${randomUUID().slice(0, 8)}`
  await page.goto('/')
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0)
  const image = await sharp({ create: { width: 16, height: 12, channels: 3, background: '#94c9c5' } }).png().toBuffer()
  const scene = await createScene(request, { title, cover: `data:image/png;base64,${image.toString('base64')}` })
  const optimized = await request.get(`/_next/image?url=${encodeURIComponent(scene.cover)}&w=640&q=75`)
  expect(optimized.status()).toBe(200)
  expect(optimized.headers()['content-type']).toMatch(/^image\//)
  await page.reload()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect.poll(() => page.getByRole('img', { name: `${title}的场景封面` }).evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('button', { name: '测试分类', exact: true }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await page.getByRole('link', { name: title, exact: true }).click()
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  const frame = page.frameLocator('iframe')
  await expect(frame.getByRole('heading', { name: '独立场景已运行' })).toBeVisible()
  await expect(frame.locator('body')).toHaveAttribute('data-webgl', 'true')
  await expect(frame.locator('body')).toHaveAttribute('data-parent', 'blocked')
  await expect(frame.locator('body')).toHaveAttribute('data-storage', 'blocked')
  await frame.getByRole('button', { name: '点击交互' }).click()
  await expect(frame.locator('body')).toHaveAttribute('data-clicked', '1')
  await expect(page.getByRole('button', { name: '暂停动效' })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: '场景画质' })).toHaveCount(0)
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await expect(frame.locator('body')).toHaveAttribute('data-clicked', '0')
  await page.screenshot({ path: testInfo.outputPath('html-scene.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('link', { name: '沉浸观看' }).click()
  await expect(page).toHaveURL(`/scenes/${scene.slug}/play`)
  await expect(page.frameLocator('iframe').getByRole('heading', { name: '独立场景已运行' })).toBeVisible()
  await expect(page.getByRole('banner')).toHaveCount(0)
  const document = await request.get(`/scenes/${scene.slug}/render`)
  expect(document.headers()['content-security-policy']).toContain('sandbox allow-scripts')
  expect(document.headers()['cache-control']).toBe('no-store')
  const cover = await request.get(scene.cover)
  expect(cover.headers()['content-type']).toBe('image/webp')
  expect((await request.get(scene.cover, { headers: { 'If-None-Match': cover.headers().etag } })).status()).toBe(304)
})

test('partial updates refresh public metadata and HTML while stale edits fail', async ({ page, request }) => {
  const scene = await createScene(request, { prompt: '原始提示词', tags: ['保持标签'], parameters: { seed: 42 } })
  const replacement = '<html><body><h1>更新后的 HTML</h1></body></html>'
  const updated = await request.patch(`/api/v1/scenes/${scene.id}`, { headers: { ...auth, 'If-Match': '"1"' }, data: { title: '已经更新的场景', html: replacement } })
  expect(updated.status()).toBe(200)
  const value = (await updated.json()).scene
  expect(value.version).toBe(2)
  expect(value.prompt).toBe('原始提示词')
  expect(value.tags).toEqual(['保持标签'])
  expect(value.parameters).toEqual({ seed: 42 })
  expect(updated.headers().etag).toBe('"2"')
  expect((await request.patch(`/api/v1/scenes/${scene.id}`, { headers: auth, data: { title: '缺少版本' } })).status()).toBe(428)
  expect((await request.patch(`/api/v1/scenes/${scene.id}`, { headers: { ...auth, 'If-Match': '"1"' }, data: { title: '过期编辑' } })).status()).toBe(412)
  const code = await request.get(`/api/v1/scenes/${scene.id}/code`, { headers: auth })
  expect(await code.text()).toBe(replacement)
  expect(code.headers().etag).toBe('"2"')
  await page.goto(`/scenes/${scene.slug}`)
  await expect(page.getByRole('heading', { name: '已经更新的场景' })).toBeVisible()
  await expect(page.frameLocator('iframe').getByRole('heading', { name: '更新后的 HTML' })).toBeVisible()
})

test('invalid inputs cannot create scenes or change managed identity fields', async ({ request }) => {
  const scene = await createScene(request)
  const before = (await (await request.get('/api/v1/scenes', { headers: auth })).json()).scenes.length
  const invalid = { slug: `invalid-${randomUUID()}`, title: '不应发布', html }
  expect((await request.post('/api/v1/scenes', { headers: auth, data: { ...invalid, html: '<div>片段</div>' } })).status()).toBe(422)
  expect((await request.post('/api/v1/scenes', { headers: auth, data: { ...invalid, cover: 'data:image/svg+xml;base64,PHN2Zz4=' } })).status()).toBe(422)
  expect((await request.post('/api/v1/scenes', { headers: auth, data: { ...invalid, notes: testApiKey } })).status()).toBe(422)
  expect((await request.post('/api/v1/scenes', { headers: auth, data: { ...invalid, slug: '../../secret' } })).status()).toBe(422)
  expect((await request.patch(`/api/v1/scenes/${scene.id}`, { headers: { ...auth, 'If-Match': '"1"' }, data: { renderer: 'other' } })).status()).toBe(422)
  const after = (await (await request.get('/api/v1/scenes', { headers: auth })).json()).scenes.length
  expect(after).toBe(before)
})

test('the viewer refuses HTML when proxy responses strip its sandbox policy', async ({ page, request }) => {
  const scene = await createScene(request)
  await page.route(`**/scenes/${scene.slug}/render?*`, async (route) => {
    if (route.request().method() === 'HEAD') await route.fulfill({ status: 200, headers: { 'content-type': 'text/html' }, body: '' })
    else await route.continue()
  })
  await page.goto(`/scenes/${scene.slug}`)
  await expect(page.getByText('场景暂时无法加载')).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('the skill client can create, inspect, download and update a scene', async ({ request }, testInfo) => {
  const script = path.resolve('.devin/skills/manage-scenes/scripts/scenes.mjs')
  const metadata = testInfo.outputPath('metadata.json')
  const source = testInfo.outputPath('scene.html')
  const slug = `cli-test-${randomUUID()}`
  await writeFile(metadata, JSON.stringify({ title: 'Skill 集成测试', slug, description: '来自 CLI' }))
  await writeFile(source, html)
  const run = async (args: string[]) => execute(process.execPath, [script, ...args, '--config', testInfo.outputPath('.env')], {
    env: { ...process.env, SCENE_API_KEY: testApiKey, SCENE_API_URL: 'http://127.0.0.1:3100' },
  })
  const dryRun = await run(['create', '--metadata', metadata, '--html', source])
  expect(JSON.parse(dryRun.stdout).mode).toBe('dry-run')
  expect((await (await request.get('/api/v1/scenes', { headers: auth })).json()).scenes.some((scene: { slug: string }) => scene.slug === slug)).toBe(false)
  const created = await run(['create', '--metadata', metadata, '--html', source, '--confirm'])
  expect(created.stdout).not.toContain(testApiKey)
  const scene = JSON.parse(created.stdout).scene
  const fetched = JSON.parse((await run(['get', scene.id])).stdout).scene
  expect(fetched.slug).toBe(slug)
  const output = testInfo.outputPath('download.html')
  await run(['code', scene.id, '--out', output])
  expect(await readFile(output, 'utf8')).toBe(html)
  const patch = testInfo.outputPath('patch.json')
  await writeFile(patch, JSON.stringify({ title: 'Skill 修改成功' }))
  const updated = await run(['update', scene.id, '--version', '1', '--metadata', patch, '--confirm'])
  expect(JSON.parse(updated.stdout).scene.version).toBe(2)
  expect(JSON.parse(updated.stdout).scene.description).toBe('来自 CLI')
})
