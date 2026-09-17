import { expectedSceneVersion, readSceneJson, sceneApi, sceneEtag, sceneJson } from '@/lib/scenes/api'
import { SceneError } from '@/lib/scenes/schema'
import { getSceneStore } from '@/lib/scenes/store'

type Context = { params: Promise<{ id: string }> }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: Context) {
  return sceneApi(request, async () => {
    const store = getSceneStore()
    const prompt = await store.getPrompt((await params).id)
    if (!prompt) throw new SceneError(404, 'PROMPT_NOT_FOUND', '未找到题目。')
    const scenes = (await store.list()).filter((scene) => scene.promptId === prompt.id).map(({ id, slug, title, model, agent, thinking, version }) => ({ id, slug, title, model, agent, thinking, version }))
    return sceneJson({ prompt, scenes, url: `/prompts/${prompt.slug}` }, 200, { ETag: sceneEtag(prompt.version) })
  })
}

export async function PATCH(request: Request, { params }: Context) {
  return sceneApi(request, async () => {
    const version = expectedSceneVersion(request)
    const prompt = await getSceneStore().updatePrompt((await params).id, await readSceneJson(request), version)
    return sceneJson({ prompt, url: `/prompts/${prompt.slug}` }, 200, { ETag: sceneEtag(prompt.version) })
  })
}
