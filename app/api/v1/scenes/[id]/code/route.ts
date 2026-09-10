import { sceneApi, sceneEtag } from '@/lib/scenes/api'
import { getSceneStore } from '@/lib/scenes/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return sceneApi(request, async () => {
    const { scene, html } = await getSceneStore().readDocument((await params).id)
    return new Response(html, { headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${scene.slug}.html"`,
      'Cache-Control': 'no-store',
      ETag: sceneEtag(scene.version),
    } })
  })
}
