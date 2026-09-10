import { readSceneJson, sceneApi, sceneEtag, sceneJson } from '@/lib/scenes/api'
import { getSceneStore } from '@/lib/scenes/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return sceneApi(request, async () => sceneJson({ scenes: await getSceneStore().list() }))
}

export async function POST(request: Request) {
  return sceneApi(request, async () => {
    const scene = await getSceneStore().create(await readSceneJson(request))
    return sceneJson({ scene, url: `/scenes/${scene.slug}` }, 201, { ETag: sceneEtag(scene.version), Location: `/api/v1/scenes/${scene.id}` })
  })
}
