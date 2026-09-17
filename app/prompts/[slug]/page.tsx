import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { SiteShell } from '@/components/site-shell'
import { PromptDetail } from '@/components/prompts/prompt-detail'
import { toSceneSummary } from '@/lib/scenes/model'
import { getSceneStore } from '@/lib/scenes/store'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const prompt = await getSceneStore().findPromptBySlug((await params).slug)
  if (!prompt) return { title: '未找到题目' }
  return { title: `${prompt.title} · 题目对比`, description: prompt.summary || `题目「${prompt.title}」在不同模型与 Coding Agent 下的实现对比。` }
}

export default async function PromptPage({ params }: { params: Promise<{ slug: string }> }) {
  const store = getSceneStore()
  const prompt = await store.findPromptBySlug((await params).slug)
  if (!prompt) notFound()
  const scenes = (await store.list()).filter((scene) => scene.promptId === prompt.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(toSceneSummary)
  return <SiteShell>
    <Suspense fallback={<div role="status" className="flex min-h-96 items-center justify-center text-sm text-muted-foreground">正在载入题目…</div>}>
      <PromptDetail prompt={prompt} scenes={scenes} />
    </Suspense>
  </SiteShell>
}
