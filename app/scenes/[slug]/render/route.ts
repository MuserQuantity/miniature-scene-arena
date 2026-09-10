import { sceneDocumentResponse } from '@/lib/scenes/sandbox'
import { getSceneStore } from '@/lib/scenes/store'

type Context = { params: Promise<{ slug: string }> }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function documentResponse(context: Context, head: boolean) {
  try {
    const store = getSceneStore()
    const scene = await store.findBySlug((await context.params).slug)
    if (!scene || scene.renderer !== 'html') return sceneDocumentResponse(head ? null : '未找到 HTML 场景。', 404)
    return sceneDocumentResponse(head ? null : await store.readHtml(scene.id))
  } catch {
    return sceneDocumentResponse(head ? null : '场景程序暂时无法读取。', 500)
  }
}

export async function GET(_request: Request, context: Context) {
  return documentResponse(context, false)
}

export async function HEAD(_request: Request, context: Context) {
  return documentResponse(context, true)
}
