import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { SceneEditor } from '@/components/admin/scene-editor'
import { scenes } from '@/lib/scenes/catalog'

export const metadata: Metadata = { title: '编辑作品资料', robots: { index: false, follow: false } }
export default async function EditScenePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const scene = scenes.find((item) => item.id === id)
  if (!scene) notFound()
  return <AdminShell><SceneEditor scene={scene} /></AdminShell>
}
