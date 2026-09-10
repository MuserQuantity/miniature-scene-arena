'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ChevronDown, ChevronUp, Expand, Maximize, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { HtmlSceneViewport } from './html-scene-viewport'
import { BackToGallery } from '@/components/site-shell'
import { CopyButton, ShareButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatSceneDate, type SceneRecord } from '@/lib/scenes/model'
import { cn } from '@/lib/utils'

export function SceneDetail({ scene, returnTo = '/' }: { scene: SceneRecord; returnTo?: string }) {
  const [resetKey, setResetKey] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const stage = useRef<HTMLDivElement>(null)

  async function fullscreen() {
    try {
      if (!stage.current?.requestFullscreen) throw new Error('unsupported')
      await stage.current.requestFullscreen()
    } catch { toast.info('当前浏览器不允许全屏，请使用上方的沉浸观看入口。') }
  }

  return <main id="main-content" className="page-shell">
    <div className="py-8 md:py-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><BackToGallery href={returnTo} /><ShareButton title={scene.title} /></div>
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-3"><p className="eyebrow">场景档案</p><h1 className="text-3xl font-medium tracking-tight md:text-4xl">{scene.title}</h1>{scene.subtitle && <p className="text-sm leading-relaxed text-muted-foreground">{scene.subtitle}</p>}</div>
          <Link href={`/scenes/${scene.slug}/play`} className={cn(buttonVariants(), 'h-11')}><Expand data-icon="inline-start" />沉浸观看<ArrowUpRight data-icon="inline-end" /></Link>
        </header>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="overflow-hidden rounded-xl border">
              <div ref={stage} className="scene-stage aspect-square sm:aspect-[4/3]" aria-label="交互观看舞台"><HtmlSceneViewport scene={scene} resetKey={resetKey} /></div>
              <div className="border-t bg-card/40 p-3 text-card-foreground">
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" onClick={() => setResetKey((key) => key + 1)}><RotateCcw data-icon="inline-start" />重新加载</Button>
                  <Button variant="ghost" size="icon" aria-label="全屏观看场景" onClick={fullscreen}><Maximize /></Button>
                </div>
              </div>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">独立 HTML 在隔离画布中运行，具体操作方式由场景定义。</p>
            <section className="pt-5" aria-label="创作资料">
              <Tabs defaultValue="prompt">
                <TabsList variant="line"><TabsTrigger value="prompt">创作提示词</TabsTrigger><TabsTrigger value="notes">制作记录</TabsTrigger></TabsList><Separator className="my-2" />
                <TabsContent value="prompt"><div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-3"><Badge variant="outline">创作提示词</Badge>{scene.prompt && <CopyButton text={scene.prompt} label="复制提示词" variant="ghost" />}</div>
                  {scene.promptSource && <p className="text-sm leading-relaxed text-muted-foreground">{scene.promptSource}</p>}
                  <div className={cn('whitespace-pre-wrap text-sm leading-7 text-foreground/85', !expanded && 'line-clamp-8')}>{scene.prompt || '暂未记录提示词。'}</div>
                  {scene.prompt && <Button variant="ghost" className="w-fit" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起提示词' : '展开完整内容'}{expanded ? <ChevronUp data-icon="inline-end" /> : <ChevronDown data-icon="inline-end" />}</Button>}
                </div></TabsContent>
                <TabsContent value="notes"><div className="flex flex-col gap-5 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{scene.notes || '暂未记录制作备注。'}</p>
                  {Object.keys(scene.parameters).length > 0 && <div className="flex flex-col gap-3"><h3 className="text-sm font-medium">生成参数</h3><pre className="max-h-80 overflow-auto rounded-lg border bg-background p-4 font-mono text-sm">{JSON.stringify(scene.parameters, null, 2)}</pre></div>}
                </div></TabsContent>
              </Tabs>
            </section>
          </div>
          <aside className="content-panel p-6 lg:sticky lg:top-7" aria-label="作品元信息">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3"><h2 className="section-title">关于这个世界</h2><p className="text-sm leading-7 text-muted-foreground">{scene.description || scene.subtitle || scene.title}</p></div>
              {scene.tags.length > 0 && <div className="flex flex-wrap gap-2">{scene.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>}
              <Separator />
              <dl className="flex flex-col gap-4">
                <div className="metadata-row"><dt>作品类型</dt><dd>HTML 场景</dd></div>
                <div className="metadata-row"><dt>创作模型</dt><dd>{scene.model || '未记录'}{scene.modelVersion && ` · ${scene.modelVersion}`}</dd></div>
                <div className="metadata-row"><dt>思考强度</dt><dd>{scene.thinking || '未记录'}</dd></div>
                <div className="metadata-row"><dt>Coding Agent</dt><dd className="font-mono">{scene.agent || '未记录'}{scene.agentVersion && ` · ${scene.agentVersion}`}</dd></div>
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
