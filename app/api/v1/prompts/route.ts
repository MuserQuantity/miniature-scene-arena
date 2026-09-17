import { readSceneJson, sceneApi, sceneEtag, sceneJson } from '@/lib/scenes/api'
import { getSceneStore } from '@/lib/scenes/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return sceneApi(request, async () => sceneJson({ prompts: await getSceneStore().listPrompts() }))
}

export async function POST(request: Request) {
  return sceneApi(request, async () => {
    const prompt = await getSceneStore().createPrompt(await readSceneJson(request))
    return sceneJson({ prompt, url: `/prompts/${prompt.slug}` }, 201, { ETag: sceneEtag(prompt.version), Location: `/api/v1/prompts/${prompt.id}` })
  })
}
