import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteShell } from '@/components/site-shell'
import { SceneDetail } from '@/components/scenes/scene-detail'
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

export default async function ScenePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string }> }) {
  const scene = await getSceneStore().findBySlug((await params).slug)
  if (!scene) notFound()
  const query = await searchParams
  const returnTo = typeof query.from === 'string' && query.from.length <= 2048 && (query.from === '/' || query.from.startsWith('/?')) ? query.from : '/'
  return <SiteShell><SceneDetail scene={scene} returnTo={returnTo} /></SiteShell>
}
