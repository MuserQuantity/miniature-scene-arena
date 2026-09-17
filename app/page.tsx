import { Suspense } from 'react'
import Link from 'next/link'
import { GitCompareArrows, Orbit } from 'lucide-react'
import { SiteShell } from '@/components/site-shell'
import { GalleryBrowser } from '@/components/gallery/gallery-browser'
import { toPromptSummary, toSceneSummary } from '@/lib/scenes/model'
import { getSceneStore } from '@/lib/scenes/store'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { scenes, prompts } = await getSceneStore().snapshot()
  const runs = new Set(scenes.map((scene) => scene.promptId).filter(Boolean))
  return <SiteShell>
    <main id="main-content" className="page-shell">
      <div className="pb-16 md:pb-20">
        <section className="py-10 md:pt-14 md:pb-10 reveal">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex max-w-3xl flex-col gap-4">
              <p className="eyebrow flex items-center gap-2.5"><Orbit className="size-4" strokeWidth={1.5} />由 AI 构想，以代码筑境</p>
              <h1 className="text-4xl font-medium leading-tight tracking-tight text-balance md:text-5xl">微小世界，无尽想象<span className="text-primary">。</span></h1>
              <p className="text-sm leading-7 text-muted-foreground md:text-base">走进那些只存在于想象中的地方。记录每一个场景，以及它的诞生过程。</p>
            </div>
            <dl className="flex items-end gap-8 text-sm text-muted-foreground">
              <div className="flex flex-col gap-1"><dt>场景</dt><dd className="font-mono text-2xl text-foreground">{scenes.length}</dd></div>
              <div className="flex flex-col gap-1"><dt>题目</dt><dd className="font-mono text-2xl text-foreground">{prompts.length}</dd></div>
              {runs.size > 0 && <Link href="/prompts" className="quiet-link inline-flex items-center gap-1.5 pb-1.5"><GitCompareArrows className="size-4" />多模型对比</Link>}
            </dl>
          </div>
        </section>
        <Suspense fallback={<div role="status" className="flex min-h-96 items-center justify-center text-sm text-muted-foreground">正在载入场景展厅…</div>}>
          <GalleryBrowser scenes={scenes.map(toSceneSummary)} prompts={prompts.map(toPromptSummary)} />
        </Suspense>
      </div>
    </main>
  </SiteShell>
}
