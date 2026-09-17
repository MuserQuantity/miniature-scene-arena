export type SceneRecord = {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  category: string
  cover: string
  promptId: string
  prompt: string
  promptSource: string
  model: string
  modelVersion: string
  thinking: string
  agent: string
  agentVersion: string
  parameters: Record<string, unknown>
  notes: string
  createdAt: string
  updatedAt: string
  renderer: 'html'
  version: number
}

export type PromptRecord = {
  id: string
  slug: string
  number: string
  title: string
  summary: string
  category: string
  tags: string[]
  body: string
  notes: string
  createdAt: string
  updatedAt: string
  version: number
}

export type SceneSummary = Pick<SceneRecord, 'id' | 'slug' | 'title' | 'subtitle' | 'description' | 'category' | 'tags' | 'cover' | 'promptId' | 'model' | 'modelVersion' | 'thinking' | 'agent' | 'agentVersion' | 'createdAt' | 'updatedAt' | 'version'>

export type PromptSummary = Pick<PromptRecord, 'id' | 'slug' | 'number' | 'title' | 'summary' | 'category' | 'tags' | 'createdAt' | 'updatedAt' | 'version'>

export function toSceneSummary(scene: SceneRecord): SceneSummary {
  const { id, slug, title, subtitle, description, category, tags, cover, promptId, model, modelVersion, thinking, agent, agentVersion, createdAt, updatedAt, version } = scene
  return { id, slug, title, subtitle, description, category, tags, cover, promptId, model, modelVersion, thinking, agent, agentVersion, createdAt, updatedAt, version }
}

export function toPromptSummary(prompt: PromptRecord): PromptSummary {
  const { id, slug, number, title, summary, category, tags, createdAt, updatedAt, version } = prompt
  return { id, slug, number, title, summary, category, tags, createdAt, updatedAt, version }
}

export function formatSceneDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(date))
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).format(new Date(date)).replaceAll('/', '.')
}

export function runLabel(scene: Pick<SceneRecord, 'model' | 'agent'>) {
  return [scene.model || '未记录模型', scene.agent || '未记录 Agent'].join(' · ')
}

export function runKey(scene: Pick<SceneRecord, 'model' | 'agent'>) {
  return `${scene.model}\u0000${scene.agent}`
}

export function comparePromptOrder(a: Pick<PromptRecord, 'number' | 'title'>, b: Pick<PromptRecord, 'number' | 'title'>) {
  const left = Number(a.number), right = Number(b.number)
  if (Number.isFinite(left) && Number.isFinite(right) && a.number && b.number && left !== right) return left - right
  if (a.number !== b.number) return a.number.localeCompare(b.number, 'zh-CN')
  return a.title.localeCompare(b.title, 'zh-CN')
}
