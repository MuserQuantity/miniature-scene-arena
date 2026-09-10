import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Orbit } from 'lucide-react'
import { SiteShell } from '@/components/site-shell'
import { GalleryBrowser } from '@/components/gallery/gallery-browser'
import { scenes, rainyKonbini } from '@/lib/scenes/catalog'

export default function HomePage() {
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
        <section aria-labelledby="perspectives-title" className="pt-12 md:pt-16">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="perspectives-title" className="section-title">同一个世界，换个角度。</h2><p className="text-sm text-muted-foreground">{rainyKonbini.title} · 场景视角</p></div>
            <div className="grid gap-5 md:grid-cols-2">
              {[{ view: 'street', title: '在街角，听一场雨', subtitle: '沿街视角', image: '/images/konbini-street.png' }, { view: 'interior', title: '推开门，灯光正暖', subtitle: '室内剖面', image: '/images/konbini-interior.png' }].map((item) => <Link key={item.view} href={`/scenes/${rainyKonbini.slug}?view=${item.view}`} className="group overflow-hidden rounded-xl border bg-card text-card-foreground">
                <div className="feature-image aspect-[2.1/1]"><Image src={item.image} alt={`${rainyKonbini.title}的${item.subtitle}真实三维截图`} width={1440} height={1000} sizes="(max-width: 768px) 100vw, 550px" className="h-full w-full object-cover" /></div>
                <div className="p-5"><div className="flex items-center justify-between gap-4"><div className="flex flex-col gap-1.5"><h3 className="text-base font-medium">{item.title}</h3><p className="text-sm text-muted-foreground">{item.subtitle}</p></div><ArrowUpRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" /></div></div>
              </Link>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  </SiteShell>
}
