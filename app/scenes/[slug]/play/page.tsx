import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SceneViewport } from '@/components/scenes/scene-viewport'
import { findScene } from '@/lib/scenes/catalog'

export const metadata: Metadata = { title: '沉浸观看', robots: { index: false, follow: true } }

export default async function ImmersivePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; still?: string }> }) {
  const { slug } = await params
  const query = await searchParams
  if (!findScene(slug)) notFound()
  const view = query.view === 'street' || query.view === 'interior' ? query.view : 'overview'
  return <main className="h-svh w-full overflow-hidden" aria-label="雨夜便利店沉浸观看"><SceneViewport view={view} paused={query.still === '1'} /></main>
}
