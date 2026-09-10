import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { SceneEditor } from '@/components/admin/scene-editor'

export const metadata: Metadata = { title: '新建资料文件', robots: { index: false, follow: false } }
export default function NewScenePage() { return <AdminShell><SceneEditor /></AdminShell> }
