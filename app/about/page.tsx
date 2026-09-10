import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Box } from 'lucide-react'
import { SiteShell } from '@/components/site-shell'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: '关于隅境', description: '一个关于 AI、代码与微小世界的场景档案。记录作品，也记录作品如何诞生。' }

export default function AboutPage() {
  return <SiteShell>
    <main id="main-content" className="page-shell py-14 md:py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-7">
        <p className="eyebrow">关于这个档案</p>
        <h1 className="text-4xl font-medium leading-snug tracking-tight text-balance md:text-5xl">让每一个想象，<br />都有一处归所。</h1>
        <p className="text-base leading-8 text-muted-foreground">隅，是一个角落。<br />境，是一个可以走进去的世界。</p>
        <p className="text-sm leading-7 text-muted-foreground">隅境收藏由 AI 辅助构建的交互场景。这里不是图片生成器，而是一间安静的数字展厅：在浏览器里走近一个空间，观察光影与结构，体验代码构建的微小世界。</p>
        <p className="text-sm leading-7 text-muted-foreground">我们同时记录创作提示、使用的工具和制作备注。可以核实的信息认真保留，没有披露的内容不作猜测。作品不只是一张封面，也包括它被创造出来的过程。</p>
        <Link href="/" className={cn(buttonVariants(), 'h-11 w-fit')}>浏览场景展厅<ArrowRight data-icon="inline-end" /></Link>
        <div className="pt-8"><Separator /><p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Box className="size-4 shrink-0 text-primary" />记录作品，也记录它如何诞生。</p></div>
      </div>
    </main>
  </SiteShell>
}
