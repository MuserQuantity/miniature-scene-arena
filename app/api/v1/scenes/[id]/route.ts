import { expectedSceneVersion, readSceneJson, sceneApi, sceneEtag, sceneJson } from '@/lib/scenes/api'
import { SceneError } from '@/lib/scenes/schema'
import { getSceneStore } from '@/lib/scenes/store'

type Context = { params: Promise<{ id: string }> }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: Context) {
  return sceneApi(request, async () => {
    const scene = await getSceneStore().get((await params).id)
    if (!scene) throw new SceneError(404, 'SCENE_NOT_FOUND', '未找到场景。')
    return sceneJson({ scene, url: `/scenes/${scene.slug}` }, 200, { ETag: sceneEtag(scene.version) })
  })
}

export async function PATCH(request: Request, { params }: Context) {
  return sceneApi(request, async () => {
    const version = expectedSceneVersion(request)
    const scene = await getSceneStore().update((await params).id, await readSceneJson(request), version)
    return sceneJson({ scene, url: `/scenes/${scene.slug}` }, 200, { ETag: sceneEtag(scene.version) })
  })
}
