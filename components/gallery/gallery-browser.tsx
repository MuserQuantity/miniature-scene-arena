'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowUpRight, Box, ChevronLeft, ChevronRight, GitCompareArrows, LayoutGrid, Rows3, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { buildGalleryEntries, filterGalleryEntries, galleryEntryHref, galleryFilterOptions, sortGalleryEntries, type GalleryEntry } from '@/lib/scenes/gallery'
import { formatShortDate, runLabel, type PromptSummary, type SceneSummary } from '@/lib/scenes/model'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12
const defaults: Record<string, string> = { layout: 'grid', sort: 'newest', page: '1' }
const sortOptions = [{ value: 'newest', label: '最新收录' }, { value: 'oldest', label: '最早收录' }, { value: 'prompt', label: '按题目排列' }, { value: 'title', label: '按标题排列' }]

type Option = { value: string; label: string }

function FilterSelect({ value, options, label, change, className }: { value: string; options: Option[]; label: string; change: (value: string) => void; className?: string }) {
  return <Select value={value} onValueChange={(next) => next !== null && change(next)} items={options}>
    <SelectTrigger aria-label={label} className={cn('max-w-full', className)}><SelectValue /></SelectTrigger>
    <SelectContent alignItemWithTrigger={false}><SelectGroup>{options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
  </Select>
}

function Cover({ entry, sizes, priority, className }: { entry: GalleryEntry; sizes: string; priority?: boolean; className?: string }) {
  const scene = entry.coverScene
  if (!scene.cover) return <div className={cn('flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground', className)}><Box className="size-10" strokeWidth={1} /><span className="text-sm">暂无封面</span></div>
  return <Image src={scene.cover} alt={`${entry.title}的场景封面`} title={`封面来自 ${runLabel(scene)}`} width={1440} height={1000} priority={priority} sizes={sizes} className={cn('h-full w-full object-cover', className)} />
}

function EntryBadges({ entry, className }: { entry: GalleryEntry; className?: string }) {
  return <div className={cn('absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3', className)}>
    <Badge variant="secondary" className="h-6 min-w-0 shrink bg-background/70 text-xs backdrop-blur-sm sm:h-7 sm:text-sm"><span className="truncate" title={entry.category}>{entry.category}</span></Badge>
    <Badge variant="secondary" className="h-6 shrink-0 bg-background/80 text-xs backdrop-blur-sm sm:h-7 sm:text-sm">{entry.prompt ? `${entry.scenes.length} 个实现` : '独立作品'}</Badge>
  </div>
}

function CoverCredit({ entry }: { entry: GalleryEntry }) {
  return <div className="flex min-w-0 flex-col gap-1.5">
    {entry.prompt ? <p className="truncate text-xs text-muted-foreground sm:text-sm" title={runLabel(entry.coverScene)}>封面 · {runLabel(entry.coverScene)}</p> : <RunBadges scene={entry.coverScene} className="text-xs sm:text-sm" />}
    {entry.matches.length < entry.scenes.length && <p className="text-xs text-primary/90">匹配 {entry.matches.length} / {entry.scenes.length} 个实现</p>}
  </div>
}

function RunBadges({ scene, className }: { scene: SceneSummary; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm', className)}>
    <Badge variant="outline" className="h-6 border-primary/40 bg-primary/10 text-primary sm:h-7 [font-size:inherit]">{scene.model || '未记录模型'}</Badge>
    {scene.thinking && <span className="text-muted-foreground">{scene.thinking}</span>}
    <span className="text-muted-foreground">{scene.agent || '未记录 Agent'}</span>
  </div>
}

function GridCard({ entry, priority }: { entry: GalleryEntry; priority: boolean }) {
  const href = galleryEntryHref(entry)
  return <article className="group flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-colors hover:border-foreground/25">
    <Link href={href} className="feature-image aspect-[4/3]" aria-label={`${entry.prompt ? '进入题目' : '进入作品'}：${entry.title}`}>
      <Cover entry={entry} priority={priority} sizes="(max-width: 1024px) 50vw, 420px" />
      <EntryBadges entry={entry} />
      <div className="absolute right-3 bottom-3 hidden size-9 items-center justify-center rounded-full border border-foreground/20 bg-background/50 text-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:flex"><ArrowUpRight className="size-4" /></div>
    </Link>
    <div className="flex flex-1 flex-col gap-3 p-3.5 sm:p-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-medium leading-snug tracking-tight text-balance sm:text-lg"><Link href={href} className="transition-colors hover:text-primary">{entry.title}</Link></h2>
        {entry.summary && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{entry.summary}</p>}
      </div>
      <div className="mt-auto flex flex-col gap-2.5 pt-1 sm:gap-3">
        <CoverCredit entry={entry} />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span title="最近收录实现" className="font-mono">{formatShortDate(entry.latestCreatedAt)}</span>
          {entry.prompt && <Link href={`/prompts/${entry.prompt.slug}`} className="inline-flex items-center gap-1 text-primary/90 transition-colors hover:text-primary"><GitCompareArrows className="size-3.5" />查看 {entry.scenes.length} 个实现</Link>}
        </div>
      </div>
    </div>
  </article>
}

function FeatureCard({ entry, priority }: { entry: GalleryEntry; priority: boolean }) {
  const href = galleryEntryHref(entry)
  return <article className="gallery-feature grid lg:grid-cols-[minmax(0,1fr)_22rem]">
    <Link href={href} className="feature-image aspect-[3/2] lg:aspect-auto lg:min-h-[26rem]" aria-label={`${entry.prompt ? '进入题目' : '进入作品'}：${entry.title}`}>
      <Cover entry={entry} priority={priority} sizes="(max-width: 1024px) 100vw, 850px" />
      <EntryBadges entry={entry} className="inset-x-5 top-5 sm:inset-x-5 sm:top-5" />
      <div className="absolute right-5 bottom-5 flex size-10 items-center justify-center rounded-full border border-foreground/20 bg-background/40 text-foreground backdrop-blur-sm"><ArrowUpRight className="size-5" /></div>
    </Link>
    <div className="flex min-w-0 flex-col justify-between gap-6 border-t p-7 lg:border-t-0 lg:border-l lg:p-8">
      <div className="flex flex-col gap-4">
        <p className="eyebrow">{entry.prompt ? '一个题目，多种表达' : '独立作品'}</p>
        <div className="flex flex-col gap-2"><h2 className="text-2xl font-medium tracking-tight text-balance md:text-3xl"><Link href={href} className="transition-colors hover:text-primary">{entry.title}</Link></h2>{entry.summary && <p className="text-sm leading-relaxed text-primary/90">{entry.summary}</p>}</div>
        {!entry.prompt && entry.coverScene.description && <p className="line-clamp-4 text-sm leading-7 text-muted-foreground">{entry.coverScene.description}</p>}
        {entry.tags.length > 0 && <div className="flex flex-wrap gap-2">{entry.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>}
      </div>
      <div className="flex flex-col gap-4">
        <CoverCredit entry={entry} />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span title="最近收录实现" className="font-mono">{formatShortDate(entry.latestCreatedAt)}</span>{entry.prompt && <Link href={`/prompts/${entry.prompt.slug}`} className="inline-flex items-center gap-1 text-primary/90 hover:text-primary"><GitCompareArrows className="size-3.5" />查看 {entry.scenes.length} 个实现</Link>}</div>
        <Link className={cn(buttonVariants(), 'h-10 w-full')} href={href}>{entry.prompt ? '查看题目与版本' : '走进这个世界'}</Link>
      </div>
    </div>
  </article>
}

function Pager({ page, pageCount, change, className }: { page: number; pageCount: number; change: (page: number) => void; className?: string }) {
  if (pageCount <= 1) return null
  const pages = [...new Set([1, pageCount, page - 1, page, page + 1].filter((value) => value >= 1 && value <= pageCount))].sort((a, b) => a - b)
  return <nav aria-label="分页" className={cn('flex items-center gap-1', className)}>
    <Button variant="ghost" size="icon" disabled={page <= 1} aria-label="上一页" onClick={() => change(page - 1)}><ChevronLeft /></Button>
    {pages.map((value, index) => <span key={value} className="flex items-center">
      {index > 0 && value - pages[index - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
      <Button variant={value === page ? 'secondary' : 'ghost'} size="icon" aria-label={`第 ${value} 页`} aria-current={value === page ? 'page' : undefined} className="font-mono" onClick={() => change(value)}>{value}</Button>
    </span>)}
    <Button variant="ghost" size="icon" disabled={page >= pageCount} aria-label="下一页" onClick={() => change(page + 1)}><ChevronRight /></Button>
  </nav>
}

export function GalleryBrowser({ scenes, prompts }: { scenes: readonly SceneSummary[]; prompts: readonly PromptSummary[] }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const section = useRef<HTMLElement>(null)
  if (!scenes.length) return <section id="collection" aria-label="场景作品集" className="reveal-late">
    <Empty className="min-h-96 border bg-card/40"><EmptyHeader><EmptyMedia variant="icon"><Box /></EmptyMedia><EmptyTitle>暂无公开场景</EmptyTitle><EmptyDescription>新的微小世界正在准备中，欢迎稍后来看看。</EmptyDescription></EmptyHeader></Empty>
  </section>

  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? searchParams.get('tag') ?? ''
  const model = searchParams.get('model') ?? ''
  const agent = searchParams.get('agent') ?? ''
  const promptSlug = searchParams.get('prompt') ?? ''
  const sort = searchParams.get('sort') ?? defaults.sort
  const layout = searchParams.get('layout') === 'feature' ? 'feature' : 'grid'

  function navigate(changes: Record<string, string>, options: { replace?: boolean; scroll?: boolean } = {}) {
    const next = new URLSearchParams(searchParams.toString())
    next.delete('tag')
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === defaults[key]) next.delete(key)
      else next.set(key, value)
    }
    if (!('page' in changes)) next.delete('page')
    const url = `${pathname}${next.size ? `?${next}` : ''}`
    if (options.replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    if (options.scroll && section.current) window.scrollTo({ top: section.current.getBoundingClientRect().top + window.scrollY - 12, behavior: 'smooth' })
  }

  const activePrompt = prompts.find((prompt) => prompt.slug === promptSlug)
  const entries = buildGalleryEntries(scenes, prompts)
  const filtered = sortGalleryEntries(filterGalleryEntries(entries, { query, category, model, agent, promptSlug }), sort)
  const promptCount = filtered.filter((entry) => entry.prompt).length
  const independentCount = filtered.length - promptCount
  const entryCount = [promptCount && `${promptCount} 道题`, independentCount && `${independentCount} 个独立作品`].filter(Boolean).join('、') || '0 道题'
  const matchCount = filtered.reduce((total, entry) => total + entry.matches.length, 0)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.max(1, Math.min(pageCount, Math.floor(Number(searchParams.get('page'))) || 1))
  const pageEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const changePage = (value: number) => navigate({ page: String(value) }, { scroll: true })
  const activeFilters = [
    category && { key: 'category', label: `分类：${category}` },
    model && { key: 'model', label: `模型：${model}` },
    agent && { key: 'agent', label: `Agent：${agent}` },
    promptSlug && { key: 'prompt', label: `题目：${activePrompt ? `${activePrompt.number ? `${activePrompt.number} ` : ''}${activePrompt.title}` : '未找到的题目'}` },
  ].filter((item): item is { key: string; label: string } => Boolean(item))
  const isFiltered = Boolean(query.trim()) || activeFilters.length > 0

  return <section id="collection" ref={section} className="flex flex-col gap-6 reveal-late" aria-label="场景作品集">
    <div className="sticky top-0 z-20 -mx-2 flex flex-col gap-3 border-b border-border/70 bg-background/90 px-2 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-full sm:w-60 lg:w-72">
          <InputGroup><InputGroupInput aria-label="搜索场景" placeholder="搜索场景、题目、模型…" maxLength={120} value={query} onChange={(event) => navigate({ q: event.target.value }, { replace: true })} /><InputGroupAddon><Search /></InputGroupAddon>{query && <InputGroupAddon align="inline-end"><InputGroupButton size="icon-sm" aria-label="清除搜索" onClick={() => navigate({ q: '' })}><X /></InputGroupButton></InputGroupAddon>}</InputGroup>
        </div>
        <FilterSelect value={category} options={galleryFilterOptions(entries, 'category', '全部分类')} label="按分类筛选" change={(value) => navigate({ category: value })} />
        <FilterSelect value={model} options={galleryFilterOptions(entries, 'model', '全部模型')} label="按创作模型筛选" change={(value) => navigate({ model: value })} />
        <FilterSelect value={agent} options={galleryFilterOptions(entries, 'agent', '全部 Agent')} label="按 Coding Agent 筛选" change={(value) => navigate({ agent: value })} />
        <div className="ml-auto flex items-center gap-2">
          <FilterSelect value={sort} label="作品排序" options={sortOptions} change={(value) => navigate({ sort: value })} />
          <ToggleGroup variant="outline" spacing={0} value={[layout]} onValueChange={(value) => value.length && navigate({ layout: value[0] as string })} aria-label="展厅布局">
            <ToggleGroupItem value="grid" aria-label="网格视图"><LayoutGrid /></ToggleGroupItem>
            <ToggleGroupItem value="feature" aria-label="大图视图"><Rows3 /></ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      {isFiltered && <div className="flex flex-wrap items-center gap-2 text-sm">
        {activeFilters.map((filter) => <Badge key={filter.key} variant="secondary" className="h-8 gap-1.5 pr-1.5">{filter.label}<button type="button" aria-label={`移除筛选 ${filter.label}`} className="flex size-5 items-center justify-center rounded-full hover:bg-foreground/10" onClick={() => navigate({ [filter.key]: '' })}><X className="size-3.5" /></button></Badge>)}
        {activePrompt && <Link href={`/prompts/${activePrompt.slug}`} className="inline-flex items-center gap-1 text-primary hover:underline"><GitCompareArrows className="size-4" />查看题目与对比</Link>}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => window.history.pushState(null, '', pathname)}><X data-icon="inline-start" />清除全部</Button>
      </div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <p aria-live="polite">{isFiltered ? '筛选出' : '共'} {entryCount}<span> · {matchCount} 个{isFiltered ? '匹配' : ''}实现</span>{pageCount > 1 && <span className="font-mono">，第 {page} / {pageCount} 页</span>}</p>
      <Pager page={page} pageCount={pageCount} change={changePage} />
    </div>
    {filtered.length ? <div className={cn(layout === 'grid' ? 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3' : 'flex flex-col gap-6')}>
      {pageEntries.map((entry, index) => layout === 'grid'
        ? <GridCard key={entry.key} entry={entry} priority={page === 1 && index < 3} />
        : <FeatureCard key={entry.key} entry={entry} priority={page === 1 && index < 2} />)}
    </div> : <Empty className="min-h-96 border"><EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>还没有找到这个世界</EmptyTitle><EmptyDescription>试试其他关键词，或清除筛选，重新逛逛展厅。</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={() => window.history.pushState(null, '', pathname)}>查看全部场景</Button></EmptyContent></Empty>}
    {pageCount > 1 && <div className="flex items-center justify-between gap-4 border-t pt-5 text-sm text-muted-foreground"><span className="font-mono">{page} / {pageCount}</span><Pager page={page} pageCount={pageCount} change={changePage} /></div>}
  </section>
}
