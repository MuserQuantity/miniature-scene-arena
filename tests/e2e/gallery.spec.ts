import { expect, test } from '@playwright/test'

test('gallery search and layout work without generated navigation', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '微小世界，无尽想象。' })).toBeVisible()
  await expect(page.getByRole('link', { name: '走进这个世界' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'API 文档' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '资料工作台' })).toBeVisible()
  await page.getByRole('button', { name: '紧凑视图' }).click()
  await expect(page).toHaveURL(/layout=list/)
  await page.getByRole('textbox', { name: '搜索场景' }).fill('不存在的场景')
  await expect(page.getByText('还没有找到这个世界')).toBeVisible()
  await page.getByRole('button', { name: '清除搜索' }).click()
  await expect(page.getByRole('link', { name: '走进这个世界' })).toBeVisible()
  await expect(page).toHaveURL(/layout=list/)
  expect(errors).toEqual([])
})

test('search terms matching filter defaults are not discarded', async ({ page }) => {
  await page.goto('/')
  for (const query of ['all', 'grid', 'newest']) {
    await page.getByRole('textbox', { name: '搜索场景' }).fill(query)
    await expect(page.getByRole('textbox', { name: '搜索场景' })).toHaveValue(query)
    await expect(page).toHaveURL(new RegExp(`q=${query}`))
    await expect(page.getByText('还没有找到这个世界')).toBeVisible()
  }
})

test('mobile navigation works without horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: '走进这个世界' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('img').evaluateAll((images) => Promise.all(images.map((element) => {
    const image = element as HTMLImageElement
    image.loading = 'eager'
    return image.decode()
  })))
  await page.screenshot({ path: testInfo.outputPath('gallery-mobile.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '打开导航' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('link', { name: '资料工作台' }).click()
  await expect(page.getByRole('heading', { name: '场景资料', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('unknown scenes and removed placeholder endpoints return 404', async ({ request }) => {
  for (const path of ['/scenes/missing', '/admin/scenes/missing', '/admin/login', '/admin/api', '/admin/api-keys', '/api/v1/status', '/api/openapi']) {
    expect((await request.get(path)).status(), path).toBe(404)
  }
})

test('unsupported WebGL shows a recoverable fallback instead of hanging', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, options?: unknown) {
      return contextId.includes('webgl') ? null : Reflect.apply(getContext, this, [contextId, options])
    } as typeof getContext
  })
  await page.goto('/scenes/rainy-night-konbini')
  await expect(page.getByText('暂时无法渲染这个世界')).toBeVisible()
  await expect(page.locator('[data-scene-ready]')).toHaveAttribute('aria-busy', 'false')
  await page.getByRole('button', { name: '重新载入', exact: true }).click()
  await expect(page.getByText('暂时无法渲染这个世界')).toBeVisible()
})

test('3D scene renders, switches views and supports immersive viewing', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/scenes/rainy-night-konbini?from=%2F%3Fq%3D%E9%9B%A8')
  await expect(page.getByRole('heading', { name: '雨夜便利店', exact: true })).toBeVisible()
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: '暂停动效' }).click()
  await expect(page.getByRole('button', { name: '继续动效' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '室内剖面', exact: true }).click()
  await expect(page).toHaveURL(/view=interior/)
  await expect(page.getByRole('link', { name: '返回场景展厅' })).toHaveAttribute('href', '/?q=雨')
  await page.getByRole('tab', { name: '制作记录' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('默认展示完整店铺')
  await page.screenshot({ path: testInfo.outputPath('scene-desktop.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('link', { name: '沉浸观看' }).click()
  await expect(page).toHaveURL(/\/play\?view=interior/)
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('banner')).toHaveCount(0)
  expect(errors).toEqual([])
})
