import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteShell } from '@/components/site-shell'
import { SceneDetail } from '@/components/scenes/scene-detail'
import { findScene, scenes } from '@/lib/scenes/catalog'

export function generateStaticParams() { return scenes.map((scene) => ({ slug: scene.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const scene = findScene((await params).slug)
  if (!scene) return { title: '未找到场景' }
  return { title: scene.title, description: scene.description, openGraph: { title: `${scene.title} · 隅境`, description: scene.description, images: [{ url: scene.cover, width: 1440, height: 1000, alt: scene.title }] } }
}

export default async function ScenePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; from?: string }> }) {
  const scene = findScene((await params).slug)
  if (!scene) notFound()
  const query = await searchParams
  const view = query.view === 'street' || query.view === 'interior' ? query.view : 'overview'
  const returnTo = typeof query.from === 'string' && query.from.length <= 2048 && (query.from === '/' || query.from.startsWith('/?')) ? query.from : '/'
  return <SiteShell><SceneDetail scene={scene} initialView={view} returnTo={returnTo} /></SiteShell>
}
