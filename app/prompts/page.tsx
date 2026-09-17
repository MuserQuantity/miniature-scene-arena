import type { Metadata } from 'next'
import Link from 'next/link'
import { GitCompareArrows } from 'lucide-react'
import { SiteShell } from '@/components/site-shell'
import { PromptMatrix } from '@/components/prompts/prompt-matrix'
import { runKey, toPromptSummary, toSceneSummary } from '@/lib/scenes/model'
import { getSceneStore } from '@/lib/scenes/store'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '题目对比', description: '同一份提示词在不同模型与 Coding Agent 下的实现一览。' }

export default async function PromptsPage() {
  const { scenes, prompts } = await getSceneStore().snapshot()
  const linked = scenes.filter((scene) => scene.promptId)
  const combos = new Set(linked.map(runKey))
  const unlinked = scenes.length - linked.length
  return <SiteShell>
    <main id="main-content" className="page-shell">
      <div className="flex flex-col gap-8 py-10 md:pt-14 md:pb-20">
        <section className="flex flex-wrap items-end justify-between gap-8 reveal">
          <div className="flex max-w-3xl flex-col gap-4">
            <p className="eyebrow flex items-center gap-2.5"><GitCompareArrows className="size-4" strokeWidth={1.5} />题目对比</p>
            <h1 className="text-4xl font-medium leading-tight tracking-tight text-balance md:text-5xl">同一份提示词，不同的世界<span className="text-primary">。</span></h1>
            <p className="text-sm leading-7 text-muted-foreground md:text-base">每一行是一个题目，每一列是一组模型与 Coding Agent。点开题目可以并排运行不同版本，看看同样的描述会长成什么样。</p>
          </div>
          <dl className="flex items-end gap-8 text-sm text-muted-foreground">
            <div className="flex flex-col gap-1"><dt>题目</dt><dd className="font-mono text-2xl text-foreground">{prompts.length}</dd></div>
            <div className="flex flex-col gap-1"><dt>模型组合</dt><dd className="font-mono text-2xl text-foreground">{combos.size}</dd></div>
            <div className="flex flex-col gap-1"><dt>关联作品</dt><dd className="font-mono text-2xl text-foreground">{linked.length}</dd></div>
          </dl>
        </section>
        <div className="reveal-late flex flex-col gap-4">
          <PromptMatrix prompts={prompts.map(toPromptSummary)} scenes={scenes.map(toSceneSummary)} />
          {unlinked > 0 && <p className="text-sm text-muted-foreground">另有 {unlinked} 个场景尚未关联题目，可在<Link href="/" className="mx-1 text-primary hover:underline">场景展厅</Link>中浏览。</p>}
        </div>
      </div>
    </main>
  </SiteShell>
}
