import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, FilePenLine, Plus } from 'lucide-react'
import { AdminShell, OfflineNotice } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { scenes, formatSceneDate } from '@/lib/scenes/catalog'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: '资料工作台', robots: { index: false, follow: false } }

export default function AdminPage() {
  return <AdminShell><div className="flex flex-col gap-8"><header className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-col gap-3"><h1 className="text-3xl font-medium tracking-tight">场景资料</h1><p className="text-sm text-muted-foreground">把每个世界的来处，记录清楚。</p></div><Link href="/admin/scenes/new" className={cn(buttonVariants(), 'h-11')}><Plus data-icon="inline-start" />新建资料文件</Link></header><OfflineNotice /><section aria-labelledby="scene-list-heading" className="content-panel"><div className="border-b p-5"><div className="flex items-center justify-between gap-4"><h2 id="scene-list-heading" className="text-base font-medium">内置公开作品</h2><span className="font-mono text-sm text-muted-foreground">{scenes.length} 个</span></div></div>{scenes.map((scene) => <article key={scene.id} className="p-5"><div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center"><Image src={scene.cover} alt={scene.title} width={180} height={125} className="w-full rounded-lg object-cover sm:w-40" /><div className="flex flex-1 flex-col gap-3"><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-medium">{scene.title}</h3><Badge variant="outline">内置场景</Badge></div><p className="text-sm text-muted-foreground">{scene.tags.join(' · ')}</p><p className="text-sm text-muted-foreground">{formatSceneDate(scene.updatedAt)} · Coding Agent: {scene.agent || '未记录'}</p></div><div className="flex items-center gap-2"><Link href={`/scenes/${scene.slug}`} className={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-label={`查看${scene.title}`}><ArrowUpRight /></Link><Link href={`/admin/scenes/${scene.id}`} className={buttonVariants({ variant: 'outline' })}><FilePenLine data-icon="inline-start" />编辑副本</Link></div></div></article>)}</section><p className="text-sm leading-7 text-muted-foreground">「编辑副本」会在当前页面打开作品资料。你可以补全模型记录、替换提示词和预览 HTML，之后导出为 JSON；关闭页面前请先导出。要修改公开作品，需将文件内容合入项目源码后重新部署。</p></div></AdminShell>
}
