import { comparePromptOrder, type PromptSummary, type SceneSummary } from './model'

export type GalleryEntry = {
  key: string
  prompt?: PromptSummary
  title: string
  summary: string
  category: string
  tags: readonly string[]
  scenes: readonly SceneSummary[]
  matches: readonly SceneSummary[]
  coverScene: SceneSummary
  latestCreatedAt: string
  oldestCreatedAt: string
}

export type GalleryFilters = {
  query?: string
  category?: string
  model?: string
  agent?: string
  promptSlug?: string
}

function entryFor(prompt: PromptSummary | undefined, scenes: readonly SceneSummary[], matching: readonly SceneSummary[] = scenes): GalleryEntry {
  const matches = [...matching].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
  const coverScene = matches.find((scene) => scene.cover) ?? matches[0]
  const dates = matches.map((scene) => scene.createdAt)
  return {
    key: prompt ? `prompt:${prompt.id}` : `scene:${coverScene.id}`,
    prompt,
    title: prompt?.title ?? coverScene.title,
    summary: prompt?.summary ?? coverScene.subtitle,
    category: prompt?.category ?? coverScene.category,
    tags: prompt?.tags ?? coverScene.tags,
    scenes,
    matches,
    coverScene,
    latestCreatedAt: dates.reduce((latest, date) => date > latest ? date : latest),
    oldestCreatedAt: dates.reduce((oldest, date) => date < oldest ? date : oldest),
  }
}

export function buildGalleryEntries(scenes: readonly SceneSummary[], prompts: readonly PromptSummary[]): GalleryEntry[] {
  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]))
  const groups = new Map<string, { prompt?: PromptSummary; scenes: SceneSummary[] }>()
  for (const scene of scenes) {
    const prompt = promptById.get(scene.promptId)
    const key = prompt ? `prompt:${prompt.id}` : `scene:${scene.id}`
    const group = groups.get(key)
    if (group) group.scenes.push(scene)
    else groups.set(key, { prompt, scenes: [scene] })
  }
  return [...groups.values()].map(({ prompt, scenes }) => entryFor(prompt, scenes))
}

export function filterGalleryEntries(entries: readonly GalleryEntry[], filters: GalleryFilters): GalleryEntry[] {
  const needle = filters.query?.trim().toLowerCase() ?? ''
  return entries.flatMap((entry) => {
    if (filters.category && filters.category !== entry.category || filters.promptSlug && filters.promptSlug !== entry.prompt?.slug) return []
    const common = [entry.title, entry.summary, entry.category, entry.prompt?.number ?? '', ...entry.tags]
    const matches = entry.scenes.filter((scene) => {
      if (filters.model && filters.model !== scene.model || filters.agent && filters.agent !== scene.agent) return false
      return !needle || [...common, scene.title, scene.subtitle, scene.category, scene.model, scene.agent, ...scene.tags].join(' ').toLowerCase().includes(needle)
    })
    return matches.length ? [entryFor(entry.prompt, entry.scenes, matches)] : []
  })
}

export function sortGalleryEntries(entries: readonly GalleryEntry[], sort: string): GalleryEntry[] {
  return [...entries].sort((a, b) => {
    if (sort === 'oldest') return a.oldestCreatedAt.localeCompare(b.oldestCreatedAt) || a.key.localeCompare(b.key)
    if (sort === 'prompt') {
      if (a.prompt && b.prompt) return comparePromptOrder(a.prompt, b.prompt) || a.key.localeCompare(b.key)
      if (a.prompt || b.prompt) return a.prompt ? -1 : 1
    }
    if (sort === 'title' || sort === 'prompt') return a.title.localeCompare(b.title, 'zh-CN') || b.latestCreatedAt.localeCompare(a.latestCreatedAt) || a.key.localeCompare(b.key)
    return b.latestCreatedAt.localeCompare(a.latestCreatedAt) || a.key.localeCompare(b.key)
  })
}

export function galleryFilterOptions(entries: readonly GalleryEntry[], field: 'category' | 'model' | 'agent', allLabel: string) {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const values = field === 'category' ? [entry.category] : entry.scenes.map((scene) => scene[field])
    for (const value of new Set(values)) if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [{ value: '', label: allLabel }, ...[...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN')).map(([value, count]) => ({ value, label: `${value} (${count})` }))]
}

export function galleryEntryHref(entry: GalleryEntry) {
  return entry.prompt ? `/prompts/${entry.prompt.slug}?compare=${encodeURIComponent(entry.coverScene.slug)}` : `/scenes/${entry.coverScene.slug}`
}
