import { expect, test } from '@playwright/test'

const html = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>预览测试</title></head><body><h1>预览已运行</h1><script>document.body.dataset.executed = "true"</script></body></html>'

test('built-in drafts export their cover and can be imported again', async ({ page }) => {
  await page.goto('/admin/scenes/scene-001')
  await expect(page.getByRole('textbox', { name: '作品标题', exact: true })).toHaveValue('雨夜便利店')
  await page.getByRole('textbox', { name: '作品标题', exact: true }).fill('雨夜便利店副本')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '验证并导出' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('rainy-night-konbini.scene.json')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const buffer = Buffer.concat(chunks)
  const draft = JSON.parse(buffer.toString())
  expect(draft.title).toBe('雨夜便利店副本')
  expect(draft.cover).toMatch(/^data:image\/png;base64,/)
  await expect(page.getByText('仅当前页面可见，不会自动保存。')).toBeVisible()
  await page.goto('/admin/scenes/new')
  await page.getByLabel('导入作品 JSON').setInputFiles({ name: 'import.scene.json', mimeType: 'application/json', buffer })
  await expect(page.getByRole('textbox', { name: '作品标题', exact: true })).toHaveValue('雨夜便利店副本')
  await expect(page.getByRole('textbox', { name: '创作提示词', exact: true })).toHaveValue(draft.prompt)
})

test('new scene validation and sandbox preview are functional', async ({ page }) => {
  await page.goto('/admin/scenes/new')
  await page.getByRole('button', { name: '验证并导出' }).click()
  await expect(page.getByRole('textbox', { name: '作品标题', exact: true })).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('textbox', { name: '作品标题', exact: true }).fill('本地测试场景')
  await page.getByRole('textbox', { name: '作品地址', exact: true }).fill('local-test-scene')
  await page.getByRole('textbox', { name: '创作提示词', exact: true }).fill('创建一个本地微缩场景')
  await page.getByRole('tab', { name: '场景程序', exact: true }).click()
  await page.getByRole('textbox', { name: '独立场景 HTML' }).fill(html)
  await page.getByRole('button', { name: '运行隔离预览' }).click()
  const frame = page.frameLocator('iframe[title="用户 HTML 场景隔离预览"]')
  await expect(frame.getByRole('heading', { name: '预览已运行' })).toBeVisible()
  await expect(frame.locator('body')).toHaveAttribute('data-executed', 'true')
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts')
  await expect(page.locator('body')).not.toHaveAttribute('data-executed')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '验证并导出' }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('local-test-scene.scene.json')
})

test('unsaved changes require confirmation before navigating away', async ({ page }) => {
  await page.goto('/admin/scenes/new')
  await page.getByRole('textbox', { name: '作品标题', exact: true }).fill('尚未保存的场景')
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '场景展厅' }).click()
  await expect(page.getByRole('dialog', { name: '还有尚未导出的修改' })).toBeVisible()
  await page.getByRole('button', { name: '返回编辑', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '作品标题', exact: true })).toHaveValue('尚未保存的场景')
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '场景展厅' }).click()
  await page.getByRole('button', { name: '放弃修改并离开' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('link', { name: '走进这个世界' })).toBeVisible()
})
