import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GET, HEAD, POST } from '../../app/api/preview/route'
import { MAX_PREVIEW_BYTES } from '../../lib/scenes/draft'

function previewRequest(html?: string) {
  const body = new FormData()
  if (html !== undefined) body.set('html', html)
  return new Request('http://localhost/api/preview', { method: 'POST', body })
}

test('preview responses keep a non-persistent opaque-origin sandbox', () => {
  const response = HEAD()
  const policy = response.headers.get('content-security-policy') ?? ''
  assert.equal(response.status, 200)
  assert.ok(policy.includes('sandbox allow-scripts'))
  assert.ok(policy.includes("connect-src 'none'"))
  assert.ok(policy.includes("frame-src 'none'"))
  assert.ok(policy.includes("form-action 'none'"))
  assert.ok(!policy.includes('allow-same-origin'))
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
})

test('valid HTML is returned unchanged with sandbox response headers', async () => {
  const html = '<!doctype html><html><body><h1>本地场景</h1></body></html>'
  const response = await POST(previewRequest(html))
  assert.equal(response.status, 200)
  assert.equal(await response.text(), html)
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8')
  assert.equal(response.headers.get('content-security-policy'), HEAD().headers.get('content-security-policy'))
})

test('unsupported preview methods and media types are rejected', async () => {
  assert.equal(GET().status, 405)
  const response = await POST(new Request('http://localhost/api/preview', { method: 'POST', body: '{}' }))
  assert.equal(response.status, 415)
})

test('missing and incomplete HTML cannot start a preview', async () => {
  assert.equal((await POST(previewRequest())).status, 422)
  assert.equal((await POST(previewRequest('<div>片段</div>'))).status, 422)
})

test('oversized content-length is rejected before the payload is read', async () => {
  const request = previewRequest('<html></html>')
  request.headers.set('content-length', String(MAX_PREVIEW_BYTES + 1))
  assert.equal((await POST(request)).status, 413)
})

test('streamed request size is bounded even without content-length', async () => {
  const request = new Request('http://localhost/api/preview', {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=scene' },
    body: new Uint8Array(MAX_PREVIEW_BYTES + 1),
  })
  assert.equal((await POST(request)).status, 413)
})

test('malformed multipart requests return an isolated error page', async () => {
  const request = new Request('http://localhost/api/preview', {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=scene' },
    body: 'invalid multipart body',
  })
  const response = await POST(request)
  assert.equal(response.status, 400)
  assert.ok((await response.text()).includes('预览未启动'))
  assert.equal(response.headers.get('content-security-policy'), HEAD().headers.get('content-security-policy'))
})
