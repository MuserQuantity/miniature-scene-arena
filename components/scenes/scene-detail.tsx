'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Box, ChevronDown, ChevronUp, Code2, Expand, Maximize, Mouse, Move, Pause, Play, RotateCcw, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import { SceneViewport } from './scene-viewport'
import type { SceneView } from './scene-canvas'
import { BackToGallery } from '@/components/site-shell'
import { CopyButton, ShareButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatSceneDate, type SceneRecord } from '@/lib/scenes/catalog'
import { cn } from '@/lib/utils'

export function SceneDetail({ scene, initialView = 'overview', returnTo = '/' }: { scene: SceneRecord; initialView?: SceneView; returnTo?: string }) {
  const [view, setView] = useState<SceneView>(initialView)
  const [resetKey, setResetKey] = useState(0)
  const [paused, setPaused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [quality, setQuality] = useState<'auto' | 'high' | 'low'>('auto')
  const stage = useRef<HTMLDivElement>(null)
  function changeView(next: SceneView) {
    setView(next)
    const url = new URL(window.location.href)
    if (next === 'overview') url.searchParams.delete('view')
    else url.searchParams.set('view', next)
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
  }
  const qualityItems = [{ value: 'auto', label: '自动画质' }, { value: 'high', label: '完整光效' }, { value: 'low', label: '轻量模式' }]
  return <main id="main-content" className="page-shell">
    <div className="py-8 md:py-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><BackToGallery href={returnTo} /><ShareButton title={scene.title} /></div>
        <header className="flex flex-wrap items-end justify-between gap-5"><div className="flex flex-col gap-3"><p className="eyebrow">场景档案 / No. 001</p><h1 className="text-3xl font-medium tracking-tight md:text-4xl">{scene.title}</h1><p className="text-sm leading-relaxed text-muted-foreground">{scene.subtitle}</p></div><Link href={`/scenes/${scene.slug}/play?view=${view}`} className={cn(buttonVariants(), 'h-11')}><Expand data-icon="inline-start" />沉浸观看 <ArrowUpRight data-icon="inline-end" /></Link></header>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="overflow-hidden rounded-xl border">
              <div ref={stage} className="scene-stage aspect-square sm:aspect-[4/3]" aria-label="交互观看舞台"><SceneViewport view={view} resetKey={resetKey} paused={paused} quality={quality} /></div>
              <div className="border-t bg-card/40 p-3 text-card-foreground"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-1"><Button variant="ghost" onClick={() => setResetKey((key) => key + 1)}><RotateCcw data-icon="inline-start" /><span className="hidden sm:inline">重置视角</span><span className="sr-only sm:hidden">重置视角</span></Button><Button variant="ghost" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}<span className="hidden sm:inline">{paused ? '继续动效' : '暂停动效'}</span><span className="sr-only sm:hidden">{paused ? '继续动效' : '暂停动效'}</span></Button></div><div className="flex items-center gap-2"><Select value={quality} items={qualityItems} onValueChange={(value) => value && setQuality(value as typeof quality)}><SelectTrigger aria-label="场景画质"><SelectValue /></SelectTrigger><SelectContent alignItemWithTrigger={false}><SelectGroup>{qualityItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select><Button variant="ghost" size="icon" aria-label="全屏观看场景" onClick={async () => { try { if (!stage.current?.requestFullscreen) throw new Error('unsupported'); await stage.current.requestFullscreen() } catch { toast.info('当前浏览器不允许全屏，请使用上方的沉浸观看入口。') } }}><Maximize /></Button></div></div></div>
            </div>
            <div className="flex flex-col gap-4"><ToggleGroup value={[view]} onValueChange={(values) => values.length && changeView(values[0] as SceneView)} aria-label="预设镜头" variant="outline"><ToggleGroupItem value="overview"><Box />俯瞰街角</ToggleGroupItem><ToggleGroupItem value="street"><ScanLine />沿街视角</ToggleGroupItem><ToggleGroupItem value="interior"><Code2 />室内剖面</ToggleGroupItem></ToggleGroup><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Mouse className="size-4" />拖拽旋转 · 滚轮缩放</span><span className="flex items-center gap-2"><Move className="size-4" />右键或双指平移</span></div></div>
            <section className="pt-5" aria-label="创作资料">
              <Tabs defaultValue="prompt"><TabsList variant="line"><TabsTrigger value="prompt">创作提示词</TabsTrigger><TabsTrigger value="notes">制作记录</TabsTrigger></TabsList><Separator className="my-2" /><TabsContent value="prompt"><div className="flex flex-col gap-5"><div className="flex flex-wrap items-center justify-between gap-3"><Badge variant="outline">需求整理稿</Badge><CopyButton text={scene.prompt} label="复制提示词" variant="ghost" /></div><p className="text-sm leading-relaxed text-muted-foreground">{scene.promptSource}</p><div className={cn('whitespace-pre-wrap text-sm leading-7 text-foreground/85', !expanded && 'line-clamp-8')}>{scene.prompt}</div><Button variant="ghost" className="w-fit" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起提示词' : '展开完整内容'}{expanded ? <ChevronUp data-icon="inline-end" /> : <ChevronDown data-icon="inline-end" />}</Button></div></TabsContent><TabsContent value="notes"><div className="flex flex-col gap-5 py-4"><p className="text-sm leading-7 text-muted-foreground">{scene.notes}</p><p className="text-sm leading-7 text-muted-foreground">默认展示完整店铺；切换「室内剖面」会隐藏屋顶，以便查看真实的货架、饮料柜和收银区。轻量模式会关闭地面反射、阴影和辉光，减少雨滴数量。</p><p className="text-sm leading-7 text-muted-foreground">模型名称、版本和思考强度没有可核实记录，因此标注为「未披露」。</p></div></TabsContent></Tabs>
            </section>
          </div>
          <aside className="content-panel p-6 lg:sticky lg:top-7" aria-label="作品元信息"><div className="flex flex-col gap-6"><div className="flex flex-col gap-3"><h2 className="section-title">关于这个世界</h2><p className="text-sm leading-7 text-muted-foreground">{scene.description}</p></div><div className="flex flex-wrap gap-2">{scene.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div><Separator /><dl className="flex flex-col gap-4"><div className="metadata-row"><dt>作品类型</dt><dd>交互式 3D</dd></div><div className="metadata-row"><dt>创作模型</dt><dd>{scene.model}</dd></div><div className="metadata-row"><dt>思考强度</dt><dd>{scene.thinking}</dd></div><div className="metadata-row"><dt>Coding Agent</dt><dd className="font-mono">{scene.agent || '未记录'}</dd></div><div className="metadata-row"><dt>渲染引擎</dt><dd>Three.js</dd></div></dl><Separator /><dl className="flex flex-col gap-4"><div className="metadata-row"><dt>收录日期</dt><dd>{formatSceneDate(scene.createdAt)}</dd></div><div className="metadata-row"><dt>最近更新</dt><dd>{formatSceneDate(scene.updatedAt)}</dd></div></dl><p className="text-sm leading-relaxed text-muted-foreground">没有人物，只有生活留下的痕迹。<br />不妨在这里，慢下来一会儿。</p></div></aside>
        </div>
      </div>
    </div>
  </main>
}
