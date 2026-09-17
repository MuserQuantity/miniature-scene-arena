'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Box, ChevronDown, ChevronUp, Expand, GitCompareArrows, Maximize, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { HtmlSceneViewport } from './html-scene-viewport'
import { BackLink, Breadcrumbs } from '@/components/site-shell'
import { CopyButton, ShareButton } from '@/components/copy-button'
import { Markdown } from '@/components/markdown'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatSceneDate, formatShortDate, type PromptRecord, type SceneRecord, type SceneSummary } from '@/lib/scenes/model'
import { cn } from '@/lib/utils'

function promptLabel(prompt: PromptRecord) {
  return prompt.number ? `题目 ${prompt.number} · ${prompt.title}` : `题目 · ${prompt.title}`
}

function SiblingCard({ scene }: { scene: SceneSummary }) {
  return <Link href={`/scenes/${scene.slug}`} className="group flex w-56 shrink-0 flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/25">
    <div className="feature-image aspect-[4/3]">{scene.cover ? <Image src={scene.cover} alt={`${scene.title}的场景封面`} width={224} height={168} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Box className="size-6" strokeWidth={1} /></div>}</div>
    <div className="flex flex-col gap-1 p-3 text-sm">
      <span className="font-medium text-primary">{scene.model || '未记录模型'}</span>
      <span className="text-muted-foreground">{scene.agent || '未记录 Agent'}{scene.thinking && ` · ${scene.thinking}`}</span>
      <span className="font-mono text-xs text-muted-foreground">{formatShortDate(scene.createdAt)}</span>
    </div>
  </Link>
}

export function SceneDetail({ scene, prompt, siblings }: { scene: SceneRecord; prompt?: PromptRecord; siblings: SceneSummary[] }) {
  const [resetKey, setResetKey] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const compareHref = prompt && siblings.length ? `/prompts/${prompt.slug}?compare=${[scene.slug, ...siblings.slice(0, 2).map((item) => item.slug)].join(',')}` : undefined

  async function fullscreen() {
    try {
      if (!stage.current?.requestFullscreen) throw new Error('unsupported')
      await stage.current.requestFullscreen()
    } catch { toast.info('当前浏览器不允许全屏，请使用上方的沉浸观看入口。') }
  }

  return <main id="main-content" className="page-shell">
    <div className="py-8 md:py-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Breadcrumbs items={[{ href: '/', label: '场景展厅' }, ...(prompt ? [{ href: `/prompts/${prompt.slug}`, label: promptLabel(prompt) }] : []), { label: scene.title }]} />
          <div className="flex items-center gap-4"><BackLink /><ShareButton title={scene.title} /></div>
        </div>
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2"><p className="eyebrow">场景档案</p><h1 className="text-3xl font-medium tracking-tight md:text-4xl">{scene.title}</h1>{scene.subtitle && <p className="text-sm leading-relaxed text-muted-foreground">{scene.subtitle}</p>}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">{scene.model || '未记录模型'}{scene.modelVersion && ` · ${scene.modelVersion}`}</Badge>
              {scene.thinking && <Badge variant="outline">思考 {scene.thinking}</Badge>}
              <Badge variant="outline">{scene.agent || '未记录 Agent'}{scene.agentVersion && ` · ${scene.agentVersion}`}</Badge>
              <Badge variant="secondary">{scene.category}</Badge>
            </div>
          </div>
          <Link href={`/scenes/${scene.slug}/play`} className={cn(buttonVariants(), 'h-11')}><Expand data-icon="inline-start" />沉浸观看<ArrowUpRight data-icon="inline-end" /></Link>
        </header>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="overflow-hidden rounded-xl border">
              <div ref={stage} className="scene-stage aspect-square sm:aspect-[4/3]" aria-label="交互观看舞台"><HtmlSceneViewport scene={scene} resetKey={resetKey} /></div>
              <div className="flex items-center justify-between gap-2 border-t bg-card/40 p-3 text-card-foreground">
                <Button variant="ghost" onClick={() => setResetKey((key) => key + 1)}><RotateCcw data-icon="inline-start" />重新加载</Button>
                <div className="flex items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline">独立 HTML 在隔离画布中运行，操作方式由场景定义</span><Button variant="ghost" size="icon" aria-label="全屏观看场景" onClick={fullscreen}><Maximize /></Button></div>
              </div>
            </div>
            {prompt && siblings.length > 0 && <section aria-label="同题作品" className="flex flex-col gap-4 rounded-xl border bg-card/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1"><h2 className="section-title">同题的其他实现</h2><p className="text-sm text-muted-foreground">同一份提示词，另外 {siblings.length} 个模型或 Agent 的版本。</p></div>
                {compareHref && <Link href={compareHref} className={cn(buttonVariants({ variant: 'outline' }), 'h-9')}><GitCompareArrows data-icon="inline-start" />并排对比</Link>}
              </div>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">{siblings.map((item) => <SiblingCard key={item.id} scene={item} />)}</div>
            </section>}
            <section aria-label="创作资料">
              <Tabs defaultValue="prompt">
                <TabsList variant="line"><TabsTrigger value="prompt">创作提示词</TabsTrigger><TabsTrigger value="notes">制作记录</TabsTrigger></TabsList><Separator className="my-2" />
                <TabsContent value="prompt"><div className="flex flex-col gap-5 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">本次实际使用的提示词</Badge>{prompt && <Link href={`/prompts/${prompt.slug}`} className="quiet-link inline-flex items-center gap-1">查看题目原文<ArrowUpRight className="size-3.5" /></Link>}</div>
                    {scene.prompt && <CopyButton text={scene.prompt} label="复制提示词" variant="ghost" />}
                  </div>
                  {scene.promptSource && <p className="text-sm leading-relaxed text-muted-foreground">{scene.promptSource}</p>}
                  {scene.prompt ? <div className="relative">
                    <div className={cn(!expanded && 'max-h-80 overflow-hidden')}><Markdown source={scene.prompt} /></div>
                    {!expanded && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />}
                  </div> : <p className="text-sm text-muted-foreground">暂未记录提示词。</p>}
                  {scene.prompt && <Button variant="ghost" className="w-fit" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起提示词' : '展开完整内容'}{expanded ? <ChevronUp data-icon="inline-end" /> : <ChevronDown data-icon="inline-end" />}</Button>}
                </div></TabsContent>
                <TabsContent value="notes"><div className="flex flex-col gap-5 py-4">
                  {scene.notes ? <Markdown source={scene.notes} className="text-muted-foreground" /> : <p className="text-sm text-muted-foreground">暂未记录制作备注。</p>}
                  {Object.keys(scene.parameters).length > 0 && <div className="flex flex-col gap-3"><h3 className="text-sm font-medium">生成参数</h3><pre className="max-h-80 overflow-auto rounded-lg border bg-background p-4 font-mono text-sm">{JSON.stringify(scene.parameters, null, 2)}</pre></div>}
                </div></TabsContent>
              </Tabs>
            </section>
          </div>
          <aside className="content-panel p-6 lg:sticky lg:top-7" aria-label="作品元信息">
            <div className="flex flex-col gap-6">
              {prompt && <div className="flex flex-col gap-3">
                <h2 className="eyebrow">题目</h2>
                <Link href={`/prompts/${prompt.slug}`} className="text-lg font-medium tracking-tight transition-colors hover:text-primary">{prompt.number && <span className="mr-2 font-mono text-muted-foreground">{prompt.number}</span>}{prompt.title}</Link>
                {prompt.summary && <p className="text-sm leading-7 text-muted-foreground">{prompt.summary}</p>}
                <p className="text-sm text-muted-foreground">已有 {siblings.length + 1} 个实现{siblings.length > 0 && <>，<Link href={`/prompts/${prompt.slug}`} className="text-primary hover:underline">查看对比</Link></>}</p>
              </div>}
              {prompt && <Separator />}
              {scene.description && <div className="flex flex-col gap-3"><h2 className="section-title">关于这个世界</h2><p className="text-sm leading-7 text-muted-foreground">{scene.description}</p></div>}
              {scene.tags.length > 0 && <div className="flex flex-wrap gap-2">{scene.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>}
              {(scene.description || scene.tags.length > 0) && <Separator />}
              <dl className="flex flex-col gap-4">
                <div className="metadata-row"><dt>创作模型</dt><dd>{scene.model || '未记录'}{scene.modelVersion && ` · ${scene.modelVersion}`}</dd></div>
                <div className="metadata-row"><dt>思考强度</dt><dd>{scene.thinking || '未记录'}</dd></div>
                <div className="metadata-row"><dt>Coding Agent</dt><dd className="font-mono">{scene.agent || '未记录'}{scene.agentVersion && ` · ${scene.agentVersion}`}</dd></div>
                <div className="metadata-row"><dt>分类</dt><dd>{scene.category}</dd></div>
                <div className="metadata-row"><dt>渲染方式</dt><dd>隔离 HTML</dd></div>
              </dl>
              <Separator />
              <dl className="flex flex-col gap-4"><div className="metadata-row"><dt>收录日期</dt><dd>{formatSceneDate(scene.createdAt)}</dd></div><div className="metadata-row"><dt>最近更新</dt><dd>{formatSceneDate(scene.updatedAt)}</dd></div><div className="metadata-row"><dt>资料版本</dt><dd className="font-mono">{scene.version}</dd></div></dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </main>
}
