import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HtmlSceneViewport } from '@/components/scenes/html-scene-viewport'
import { getSceneStore } from '@/lib/scenes/store'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '沉浸观看', robots: { index: false, follow: true } }

export default async function ImmersivePage({ params }: { params: Promise<{ slug: string }> }) {
  const scene = await getSceneStore().findBySlug((await params).slug)
  if (!scene) notFound()
  return <main className="h-svh w-full overflow-hidden" aria-label={`${scene.title}沉浸观看`}><HtmlSceneViewport scene={scene} /></main>
}
