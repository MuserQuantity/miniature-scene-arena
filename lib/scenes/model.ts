export type SceneRecord = {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  category: string
  cover: string
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

export function formatSceneDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(date))
}
