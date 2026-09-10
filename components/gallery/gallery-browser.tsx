'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowDownWideNarrow, ArrowRight, ArrowUpRight, Box, ChevronLeft, ChevronRight, Code2, LayoutGrid, List, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { SceneRecord } from '@/lib/scenes/model'
import { cn } from '@/lib/utils'

function FilterSelect({ value, options, label, change }: { value: string; options: { label: string; value: string }[]; label: string; change: (value: string) => void }) {
  return <Select value={value} onValueChange={(next) => next !== null && change(next)} items={options}>
    <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
    <SelectContent alignItemWithTrigger={false}><SelectGroup>{options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
  </Select>
}

function SceneCard({ scene, compact, returnTo }: { scene: SceneRecord; compact: boolean; returnTo: string }) {
  const href = `/scenes/${scene.slug}${returnTo === '/' ? '' : `?from=${encodeURIComponent(returnTo)}`}`
  return <article className={cn('gallery-feature grid lg:grid-cols-[minmax(0,1fr)_21rem]', compact && 'lg:grid-cols-[20rem_minmax(0,1fr)]')}>
    <Link href={href} className={cn('feature-image min-h-72 lg:min-h-full', compact ? 'aspect-[4/3]' : 'aspect-[3/2] lg:aspect-auto')} aria-label={`进入作品：${scene.title}`}>
      {scene.cover ? <Image src={scene.cover} alt={`${scene.title}的场景封面`} width={1440} height={1000} priority sizes="(max-width: 1024px) 100vw, 850px" className="h-full w-full object-cover" /> : <div className="flex h-full min-h-72 flex-col items-center justify-center gap-4 text-muted-foreground"><Box className="size-12" strokeWidth={1} /><span className="text-sm">暂无封面</span></div>}
      <div className="absolute top-5 left-5"><Badge variant="secondary"><Box data-icon="inline-start" />HTML 场景</Badge></div>
      <div className="absolute bottom-5 left-5 flex items-center gap-2 text-sm text-foreground/70"><span className="size-1.5 rounded-full bg-primary" />独立场景程序</div>
      <div className="absolute right-5 bottom-5 flex size-10 items-center justify-center rounded-full border border-foreground/20 bg-background/40 text-foreground backdrop-blur-sm"><ArrowUpRight className="size-5" /></div>
    </Link>
    <div className={cn('flex flex-col justify-between border-t lg:border-t-0 lg:border-l', compact && 'lg:min-h-80')}>
      <div className="p-7 lg:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3"><span className="eyebrow">精选收录</span><span className="text-sm text-muted-foreground">{scene.category}</span></div>
          <div className="flex flex-col gap-3"><h2 className="text-3xl font-medium tracking-tight text-balance"><Link href={href}>{scene.title}</Link></h2><p className="text-sm leading-relaxed text-primary/90">{scene.subtitle}</p></div>
          <p className="text-sm leading-7 text-muted-foreground">{scene.description}</p>
          <div className="flex flex-wrap gap-2">{scene.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>
        </div>
      </div>
      <div className="px-7 pb-7 lg:px-8 lg:pb-8">
        <div className="flex flex-col gap-5">
          <Separator />
          <dl className="flex flex-col gap-3">
            <div className="metadata-row"><dt>Coding Agent</dt><dd className="flex items-center gap-2"><Code2 className="size-4 text-muted-foreground" />{scene.agent || '未记录'}</dd></div>
            <div className="metadata-row"><dt>创作模型</dt><dd className="text-muted-foreground">{scene.model || '未记录'}</dd></div>
          </dl>
          <Link className={cn(buttonVariants(), 'h-11 w-full')} href={href}>走进这个世界 <ArrowRight data-icon="inline-end" /></Link>
          <p className="text-center text-sm text-muted-foreground">独立运行 · 隔离画布 · 沉浸观看</p>
        </div>
      </div>
    </div>
  </article>
}

export function GalleryBrowser({ scenes }: { scenes: readonly SceneRecord[] }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  if (!scenes.length) return <section id="collection" aria-label="场景作品集" className="reveal-late">
    <Empty className="min-h-96 border bg-card/40"><EmptyHeader><EmptyMedia variant="icon"><Box /></EmptyMedia><EmptyTitle>暂无公开场景</EmptyTitle><EmptyDescription>新的微小世界正在准备中，欢迎稍后来看看。</EmptyDescription></EmptyHeader></Empty>
  </section>
  const query = searchParams.get('q') ?? ''
  const model = searchParams.get('model') ?? ''
  const agent = searchParams.get('agent') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const compact = searchParams.get('layout') === 'list'
  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString())
    const defaults: Record<string, string> = { layout: 'grid', sort: 'newest', page: '1' }
    if (!value || value === defaults[key]) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    window.history.replaceState(null, '', `${pathname}${next.size ? `?${next}` : ''}`)
  }
  const filtered = scenes.filter((scene) => {
    const haystack = `${scene.title} ${scene.description} ${scene.tags.join(' ')}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase()) && (!model || scene.model === model) && (!agent || scene.agent === agent) && (!tag || scene.category === tag)
  }).sort((a, b) => sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt))
  const pageSize = 6
  const pageCount = Math.ceil(filtered.length / pageSize)
  const requestedPage = Math.floor(Number(searchParams.get('page'))) || 1
  const page = Math.max(1, Math.min(pageCount || 1, requestedPage))
  const pageScenes = filtered.slice((page - 1) * pageSize, page * pageSize)
  const returnTo = `${pathname}${searchParams.size ? `?${searchParams}` : ''}`
  const modelOptions = [{ value: '', label: '全部模型' }, ...Array.from(new Set(scenes.map((scene) => scene.model).filter(Boolean))).map((value) => ({ value, label: value }))]
  const agentOptions = [{ value: '', label: '全部 Agent' }, ...Array.from(new Set(scenes.map((scene) => scene.agent).filter(Boolean))).map((value) => ({ value, label: value }))]
  const categories = [...new Set(scenes.map((scene) => scene.category))]
  const isFiltered = query || model || agent || tag
  return <section id="collection" className="flex flex-col gap-6 reveal-late" aria-label="场景作品集">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
      <div className="flex items-center gap-4">
        <ToggleGroup value={[tag]} onValueChange={(value) => value.length && update('tag', value[0] as string)} aria-label="作品分类" spacing={3} className="flex-wrap">
          <ToggleGroupItem value="">全部场景 <span className="font-mono text-muted-foreground">{scenes.length}</span></ToggleGroupItem>
          {categories.map((category) => <ToggleGroupItem key={category} value={category}>{category}</ToggleGroupItem>)}
        </ToggleGroup>
      </div>
      <div className="w-full lg:w-72">
        <InputGroup><InputGroupInput aria-label="搜索场景" placeholder="搜索场景、关键词…" maxLength={120} value={query} onChange={(event) => update('q', event.target.value)} /><InputGroupAddon><Search /></InputGroupAddon>{query && <InputGroupAddon align="inline-end"><InputGroupButton size="icon-sm" aria-label="清除搜索" onClick={() => update('q', '')}><X /></InputGroupButton></InputGroupAddon>}</InputGroup>
      </div>
    </div>
    <Separator />
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3"><FilterSelect value={model} options={modelOptions} label="按创作模型筛选" change={(value) => update('model', value)} /><FilterSelect value={agent} options={agentOptions} label="按 Coding Agent 筛选" change={(value) => update('agent', value)} />{isFiltered && <Button variant="ghost" onClick={() => window.history.replaceState(null, '', pathname)}><X data-icon="inline-start" />重置筛选</Button>}</div>
      <div className="flex items-center gap-4"><div className="flex items-center gap-2"><ArrowDownWideNarrow className="hidden size-4 text-muted-foreground sm:block" /><FilterSelect value={sort} label="作品排序" options={[{ value: 'newest', label: '最新收录' }, { value: 'oldest', label: '最早收录' }]} change={(value) => update('sort', value)} /></div><ToggleGroup variant="outline" spacing={0} value={[compact ? 'list' : 'grid']} onValueChange={(value) => value.length && update('layout', value[0] as string)} aria-label="展厅布局"><ToggleGroupItem value="grid" aria-label="画廊视图"><LayoutGrid /></ToggleGroupItem><ToggleGroupItem value="list" aria-label="紧凑视图"><List /></ToggleGroupItem></ToggleGroup></div>
    </div>
    <div aria-live="polite" className="sr-only">找到 {filtered.length} 个场景</div>
    {filtered.length ? pageScenes.map((scene) => <SceneCard key={scene.id} scene={scene} compact={compact} returnTo={returnTo} />) : <Empty className="min-h-96 border"><EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>还没有找到这个世界</EmptyTitle><EmptyDescription>试试其他关键词，或清除筛选，重新逛逛展厅。</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={() => window.history.replaceState(null, '', pathname)}>查看全部场景</Button></EmptyContent></Empty>}
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground"><span>共 {filtered.length} 个场景<span className="hidden sm:inline">，每一个都可以亲自走近。</span></span><div className="flex items-center gap-3"><Button variant="ghost" size="icon" disabled={page <= 1} aria-label="上一页" onClick={() => update('page', String(page - 1))}><ChevronLeft /></Button><span className="font-mono">{String(pageCount ? page : 0).padStart(2, '0')} / {String(pageCount).padStart(2, '0')}</span><Button variant="ghost" size="icon" disabled={page >= pageCount} aria-label="下一页" onClick={() => update('page', String(page + 1))}><ChevronRight /></Button></div></div>
  </section>
}
