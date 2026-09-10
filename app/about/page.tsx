import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Box } from 'lucide-react'
import { SiteShell } from '@/components/site-shell'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: '关于隅境', description: '一个关于 AI、代码与微小世界的场景档案。记录作品，也记录作品如何诞生。' }

export default function AboutPage() {
  return <SiteShell><main id="main-content" className="page-shell py-14 md:py-20"><div className="grid items-center gap-10 lg:grid-cols-2"><div className="flex flex-col gap-7"><p className="eyebrow">关于这个档案</p><h1 className="text-4xl font-medium leading-snug tracking-tight text-balance md:text-5xl">让每一个想象，<br />都有一处归所。</h1><p className="text-base leading-8 text-muted-foreground">隅，是一个角落。<br />境，是一个可以走进去的世界。</p><p className="text-sm leading-7 text-muted-foreground">隅境收藏由 AI 辅助构建的交互场景。这里不是图片生成器，而是一间安静的数字展厅：你可以绕着建筑走一圈，凑近一排货架，或只是看一会儿落在街角的雨。</p><p className="text-sm leading-7 text-muted-foreground">我们同时记录创作提示、使用的工具和制作备注。可以核实的信息认真保留，没有披露的内容不作猜测。作品不只是一张封面，也包括它被创造出来的过程。</p><Link href="/scenes/rainy-night-konbini" className={cn(buttonVariants(), 'h-11 w-fit')}>从雨夜便利店开始<ArrowRight data-icon="inline-end" /></Link></div><figure className="overflow-hidden rounded-xl border bg-card text-card-foreground"><Image src="/images/rainy-konbini.png" alt="隅境首个交互作品雨夜便利店，真实三维渲染" width={1440} height={1000} priority className="w-full" /><figcaption className="p-5 text-sm text-muted-foreground">第一处角落 · 雨夜便利店 · 2026</figcaption></figure></div><div className="pt-16"><Separator /><div className="py-8"><div className="flex flex-wrap items-center justify-between gap-5 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Box className="size-4 text-primary" />真实三维，不是静态图片冒充。</span><span>以 React Three Fiber 与 Three.js 构建</span></div></div></div></main></SiteShell>
}
