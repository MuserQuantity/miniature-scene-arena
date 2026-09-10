import { expect, test, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { testApiKey } from './settings'

async function addEntry(request: APIRequestContext) {
  const response = await request.post('/api/v1/scenes', {
    headers: { 'X-API-Key': testApiKey },
    data: { title: '展厅验证场景', slug: `gallery-${randomUUID()}`, category: '回归测试', model: '测试模型', html: '<html><body>验证场景</body></html>' },
  })
  expect(response.status()).toBe(201)
}

test('a fresh gallery has a real empty state with no demo content', async ({ page, request }, testInfo) => {
  const catalog = await request.get('/api/v1/scenes', { headers: { 'X-API-Key': testApiKey } })
  expect((await catalog.json()).scenes).toEqual([])
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '微小世界，无尽想象。' })).toBeVisible()
  await expect(page.getByText('暂无公开场景')).toBeVisible()
  await expect(page.getByRole('link', { name: '走进这个世界' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '资料工作台' })).toHaveCount(0)
  await expect(page.locator('img')).toHaveCount(0)
  expect(await page.content()).not.toContain('雨夜便利店')
  await page.screenshot({ path: testInfo.outputPath('empty-gallery.png'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await expect(page.getByText('暂无公开场景')).toBeVisible()
  const about = await request.get('/about')
  expect(await about.text()).not.toContain('rainy-konbini')
})

test('gallery search and layout work with API-created scenes', async ({ page, request }) => {
  await addEntry(request)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('link', { name: '走进这个世界' }).first()).toBeVisible()
  await expect(page.getByText('暂无公开场景')).toHaveCount(0)
  await page.getByRole('button', { name: '紧凑视图' }).click()
  await expect(page).toHaveURL(/layout=list/)
  await page.getByRole('textbox', { name: '搜索场景' }).fill('不存在的场景')
  await expect(page.getByText('还没有找到这个世界')).toBeVisible()
  await page.getByRole('button', { name: '清除搜索' }).click()
  await expect(page.getByRole('link', { name: '走进这个世界' }).first()).toBeVisible()
  await expect(page).toHaveURL(/layout=list/)
  expect(errors).toEqual([])
})

test('search terms matching filter defaults are not discarded', async ({ page, request }) => {
  await addEntry(request)
  await page.goto('/')
  for (const query of ['all', 'grid', 'newest']) {
    await page.getByRole('textbox', { name: '搜索场景' }).fill(query)
    await expect(page.getByRole('textbox', { name: '搜索场景' })).toHaveValue(query)
    await expect(page).toHaveURL(new RegExp(`q=${query}`))
    await expect(page.getByText('还没有找到这个世界')).toBeVisible()
  }
})

test('mobile navigation works without horizontal overflow', async ({ page, request }, testInfo) => {
  await addEntry(request)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: '走进这个世界' }).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('gallery-mobile.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '打开导航' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('link', { name: '资料工作台' })).toHaveCount(0)
  await page.getByRole('dialog').getByRole('link', { name: '关于隅境' }).click()
  await expect(page).toHaveURL('/about')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('removed demo, editor and preview paths return 404', async ({ request }) => {
  for (const endpoint of ['/scenes/missing', '/scenes/rainy-night-konbini', '/scenes/rainy-night-konbini/play', '/images/rainy-konbini.png', '/admin', '/admin/scenes/new', '/admin/api', '/api/preview', '/api/v1/status', '/api/openapi']) {
    expect((await request.get(endpoint)).status(), endpoint).toBe(404)
  }
  expect((await request.post('/api/preview', { data: '<html></html>' })).status()).toBe(404)
})
