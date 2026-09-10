export const sceneSandboxPolicy = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
  'sandbox allow-scripts',
].join('; ')

export function hasSceneSandbox(policy: string) {
  const directives = policy.split(';').map((value) => value.trim().replace(/\s+/g, ' '))
  return ["connect-src 'none'", "frame-src 'none'", "form-action 'none'", 'sandbox allow-scripts'].every((expected) => {
    const name = expected.split(' ')[0]
    return directives.filter((value) => value === name || value.startsWith(`${name} `)).length === 1 && directives.includes(expected)
  })
}

export function sceneDocumentResponse(html: string | null, status = 200) {
  return new Response(html, { status, headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': sceneSandboxPolicy,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer',
  } })
}
