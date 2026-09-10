import { createHash } from 'node:crypto'
import { getSceneStore } from '@/lib/scenes/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; asset?: string }> }) {
  try {
    const { slug, asset } = await params
    const image = await getSceneStore().readCoverForSlug(slug, asset)
    if (!image) return new Response('未找到封面。', { status: 404, headers: { 'Cache-Control': 'no-store' } })
    const etag = `"${createHash('sha256').update(image).digest('hex')}"`
    const headers = { 'Content-Type': 'image/webp', 'Cache-Control': 'public, no-cache', ETag: etag, 'X-Content-Type-Options': 'nosniff' }
    return request.headers.get('if-none-match') === etag
      ? new Response(null, { status: 304, headers })
      : new Response(new Uint8Array(image), { headers })
  } catch {
    return new Response('暂时无法读取封面。', { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
