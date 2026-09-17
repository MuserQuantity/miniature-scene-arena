'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowUpRight, Box, Check, ChevronDown, ChevronUp, GitCompareArrows, Plus, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { HtmlSceneViewport } from '@/components/scenes/html-scene-viewport'
import { BackLink, Breadcrumbs } from '@/components/site-shell'
import { CopyButton } from '@/components/copy-button'
import { Markdown } from '@/components/markdown'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { formatShortDate, runLabel, type PromptRecord, type SceneSummary } from '@/lib/scenes/model'
import { cn } from '@/lib/utils'

const MAX_COMPARE = 3

function RunCard({ scene, selected, disabled, toggle }: { scene: SceneSummary; selected: boolean; disabled: boolean; toggle: () => void }) {
  return <article className={cn('flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-colors', selected ? 'border-primary/60' : 'hover:border-foreground/25')}>
    <Link href={`/scenes/${scene.slug}`} className="feature-image aspect-[4/3]" aria-label={`进入作品：${scene.title}（${runLabel(scene)}）`}>
      {scene.cover ? <Image src={scene.cover} alt={`${scene.title}的场景封面`} width={960} height={720} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><Box className="size-8" strokeWidth={1} /><span className="text-sm">暂无封面</span></div>}
      {selected && <span className="absolute top-3 left-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-4" /></span>}
    </Link>
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex flex-col gap-1"><span className="font-medium text-primary">{scene.model || '未记录模型'}{scene.modelVersion && <span className="text-muted-foreground"> · {scene.modelVersion}</span>}</span><span className="text-sm text-muted-foreground">{scene.agent || '未记录 Agent'}{scene.agentVersion && ` · ${scene.agentVersion}`}{scene.thinking && ` · 思考 ${scene.thinking}`}</span></div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="font-mono text-xs text-muted-foreground">{formatShortDate(scene.createdAt)} · v{scene.version}</span>
        <Button variant={selected ? 'secondary' : 'outline'} size="sm" aria-pressed={selected} disabled={disabled && !selected} onClick={toggle}>{selected ? <><Check data-icon="inline-start" />已加入对比</> : <><Plus data-icon="inline-start" />加入对比</>}</Button>
      </div>
    </div>
  </article>
}

export function PromptDetail({ prompt, scenes }: { prompt: PromptRecord; scenes: SceneSummary[] }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [resetKey, setResetKey] = useState(0)
  const [expanded, setExpanded] = useState(scenes.length === 0)
  const bySlug = new Map(scenes.map((scene) => [scene.slug, scene]))
  const selected = [...new Set((searchParams.get('compare') ?? '').split(',').filter((slug) => bySlug.has(slug)))].slice(0, MAX_COMPARE)

  function setSelected(next: string[]) {
    const params = new URLSearchParams(searchParams.toString())
    if (next.length) params.set('compare', next.join(','))
    else params.delete('compare')
    window.history.replaceState(null, '', `${pathname}${params.size ? `?${params.toString().replaceAll('%2C', ',')}` : ''}`)
  }
  const toggle = (slug: string) => setSelected(selected.includes(slug) ? selected.filter((item) => item !== slug) : [...selected, slug].slice(0, MAX_COMPARE))
  const compared = selected.map((slug) => bySlug.get(slug)!)

  return <main id="main-content" className="page-shell">
    <div className="flex flex-col gap-8 py-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Breadcrumbs items={[{ href: '/', label: '场景展厅' }, { href: '/prompts', label: '题目对比' }, { label: prompt.title }]} />
        <BackLink href="/prompts" label="返回题目对比" />
      </div>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="eyebrow">{prompt.number ? `题目 ${prompt.number}` : '题目'}</p>
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">{prompt.title}</h1>
          {prompt.summary && <p className="text-sm leading-7 text-muted-foreground md:text-base">{prompt.summary}</p>}
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{prompt.category}</Badge>{prompt.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
          <span><span className="font-mono text-2xl text-foreground">{scenes.length}</span> 个实现</span>
          {scenes.length > 0 && <Link href={`/?prompt=${encodeURIComponent(prompt.slug)}`} className="quiet-link inline-flex items-center gap-1"><SlidersHorizontal className="size-3.5" />在展厅中筛选</Link>}
        </div>
      </header>

      {compared.length > 0 && <section aria-label="并排对比" className="flex flex-col gap-4 rounded-xl border bg-card/40 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><GitCompareArrows className="size-4 text-primary" /><h2 className="section-title">并排对比</h2><span className="text-sm text-muted-foreground">{compared.length} / {MAX_COMPARE}</span></div>
          <div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => setResetKey((key) => key + 1)}><RotateCcw data-icon="inline-start" />全部重新加载</Button><Button variant="ghost" size="sm" onClick={() => setSelected([])}><X data-icon="inline-start" />清空</Button></div>
        </div>
        <div className={cn('grid gap-4', compared.length === 2 && 'lg:grid-cols-2', compared.length >= 3 && 'md:grid-cols-2 xl:grid-cols-3')}>
          {compared.map((scene) => <figure key={scene.id} className="flex flex-col overflow-hidden rounded-lg border bg-card">
            <figcaption className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm">
              <div className="flex min-w-0 flex-col"><span className="truncate font-medium text-primary">{scene.model || '未记录模型'}</span><span className="truncate text-xs text-muted-foreground">{scene.agent || '未记录 Agent'}{scene.thinking && ` · ${scene.thinking}`}</span></div>
              <div className="flex shrink-0 items-center gap-1"><Link href={`/scenes/${scene.slug}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))} aria-label={`进入作品：${scene.title}`}><ArrowUpRight /></Link><Button variant="ghost" size="icon-sm" aria-label="移出对比" onClick={() => toggle(scene.slug)}><X /></Button></div>
            </figcaption>
            <div className="scene-stage aspect-[4/3]"><HtmlSceneViewport scene={scene} resetKey={resetKey} /></div>
          </figure>)}
        </div>
        <p className="text-xs text-muted-foreground">每个版本都在独立的隔离画布中运行；同时运行多个 WebGL 场景会占用较多显卡资源，建议最多对比 {MAX_COMPARE} 个。</p>
      </section>}

      <section aria-label="题目实现" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">全部实现</h2>
          {scenes.length > 1 && compared.length === 0 && <Button variant="outline" size="sm" onClick={() => setSelected(scenes.slice(0, MAX_COMPARE).map((scene) => scene.slug))}><GitCompareArrows data-icon="inline-start" />对比前 {Math.min(scenes.length, MAX_COMPARE)} 个</Button>}
        </div>
        {scenes.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{scenes.map((scene) => <RunCard key={scene.id} scene={scene} selected={selected.includes(scene.slug)} disabled={selected.length >= MAX_COMPARE} toggle={() => toggle(scene.slug)} />)}</div>
          : <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><Box /></EmptyMedia><EmptyTitle>这个题目还没有作品</EmptyTitle><EmptyDescription>关联到该题目的作品发布后会出现在这里。</EmptyDescription></EmptyHeader></Empty>}
      </section>

      <section aria-label="题目原文" className="flex flex-col gap-4">
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-col gap-1"><h2 className="section-title">题目原文</h2><p className="text-sm text-muted-foreground">所有实现共用的提示词；各作品页面另存有当次实际使用的文本。</p></div><CopyButton text={prompt.body} label="复制题目" variant="ghost" /></div>
        <div className="relative">
          <div className={cn(!expanded && 'max-h-72 overflow-hidden')}><Markdown source={prompt.body} /></div>
          {!expanded && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />}
        </div>
        <Button variant="ghost" className="w-fit" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起题目' : '展开完整题目'}{expanded ? <ChevronUp data-icon="inline-end" /> : <ChevronDown data-icon="inline-end" />}</Button>
        {prompt.notes && <div className="flex flex-col gap-2"><h3 className="text-sm font-medium">题目备注</h3><Markdown source={prompt.notes} className="text-muted-foreground" /></div>}
      </section>
    </div>
  </main>
}
