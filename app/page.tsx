import { Suspense } from 'react'
import { Orbit } from 'lucide-react'
import { SiteShell } from '@/components/site-shell'
import { GalleryBrowser } from '@/components/gallery/gallery-browser'
import { getSceneStore } from '@/lib/scenes/store'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const scenes = await getSceneStore().list()
  return <SiteShell>
    <main id="main-content" className="page-shell">
      <div className="pb-16 md:pb-20">
        <section className="py-12 md:pt-16 md:pb-14 reveal">
          <div className="flex items-end justify-between gap-10">
            <div className="flex max-w-3xl flex-col gap-5">
              <p className="eyebrow flex items-center gap-2.5"><Orbit className="size-4" strokeWidth={1.5} />由 AI 构想，以代码筑境</p>
              <h1 className="text-4xl font-medium leading-tight tracking-tight text-balance md:text-5xl lg:text-[3.25rem]">微小世界，无尽想象<span className="text-primary">。</span></h1>
              <p className="text-sm leading-7 text-muted-foreground md:text-base">走进那些只存在于想象中的地方。<br className="sm:hidden" />记录每一个场景，以及它的诞生过程。</p>
            </div>
            <div className="hidden shrink-0 flex-col gap-3 text-right text-sm text-muted-foreground lg:flex"><span className="flex items-center justify-end gap-2"><span className="size-1.5 rounded-full bg-primary" />一个持续生长的场景档案</span><span className="font-mono text-foreground/50">EST. 2026</span></div>
          </div>
        </section>
        <Suspense fallback={<div role="status" className="flex min-h-96 items-center justify-center text-sm text-muted-foreground">正在载入场景展厅…</div>}>
          <GalleryBrowser scenes={scenes} />
        </Suspense>
      </div>
    </main>
  </SiteShell>
}
