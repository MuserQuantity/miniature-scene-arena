import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteShell } from '@/components/site-shell'
import { SceneDetail } from '@/components/scenes/scene-detail'
import { toSceneSummary } from '@/lib/scenes/model'
import { getSceneStore } from '@/lib/scenes/store'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const scene = await getSceneStore().findBySlug((await params).slug)
  if (!scene) return { title: '未找到场景' }
  return {
    title: scene.title,
    description: scene.description,
    openGraph: { title: `${scene.title} · 隅境`, description: scene.description, images: scene.cover ? [{ url: scene.cover, width: 1440, height: 1000, alt: scene.title }] : [] },
    twitter: { card: scene.cover ? 'summary_large_image' : 'summary', title: scene.title, description: scene.description, images: scene.cover ? [scene.cover] : [] },
  }
}

export default async function ScenePage({ params }: { params: Promise<{ slug: string }> }) {
  const store = getSceneStore()
  const scene = await store.findBySlug((await params).slug)
  if (!scene) notFound()
  const prompt = scene.promptId ? await store.getPrompt(scene.promptId) : undefined
  const siblings = prompt ? (await store.list()).filter((record) => record.promptId === prompt.id && record.id !== scene.id).map(toSceneSummary) : []
  return <SiteShell><SceneDetail scene={scene} prompt={prompt} siblings={siblings} /></SiteShell>
}
