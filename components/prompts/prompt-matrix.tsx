import Image from 'next/image'
import Link from 'next/link'
import { Box, GitCompareArrows } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { comparePromptOrder, runKey, type PromptSummary, type SceneSummary } from '@/lib/scenes/model'
import { cn } from '@/lib/utils'

type Column = { key: string; model: string; agent: string; count: number }

export function buildMatrix(prompts: readonly PromptSummary[], scenes: readonly SceneSummary[]) {
  const columns = new Map<string, Column>()
  const cells = new Map<string, SceneSummary[]>()
  for (const scene of scenes) {
    if (!scene.promptId) continue
    const key = runKey(scene)
    const column = columns.get(key) ?? { key, model: scene.model, agent: scene.agent, count: 0 }
    column.count += 1
    columns.set(key, column)
    const cellKey = `${scene.promptId}\u0000${key}`
    cells.set(cellKey, [...(cells.get(cellKey) ?? []), scene])
  }
  const rows = [...prompts].sort(comparePromptOrder).map((prompt) => ({ prompt, runs: scenes.filter((scene) => scene.promptId === prompt.id).length }))
  return { columns: [...columns.values()].sort((a, b) => b.count - a.count || a.model.localeCompare(b.model, 'zh-CN') || a.agent.localeCompare(b.agent, 'zh-CN')), rows, cells }
}

function Cell({ scenes }: { scenes: SceneSummary[] | undefined }) {
  if (!scenes?.length) return <div aria-label="尚未生成" className="flex aspect-[4/3] w-28 items-center justify-center rounded-md border border-dashed border-border/80 text-xs text-muted-foreground/70">未生成</div>
  const [scene, ...rest] = scenes
  return <Link href={`/scenes/${scene.slug}`} className="group relative block w-28 overflow-hidden rounded-md border bg-card transition-colors hover:border-primary/60" aria-label={`查看 ${scene.title}（${scene.model || '未记录模型'} · ${scene.agent || '未记录 Agent'}）`}>
    <div className="feature-image aspect-[4/3]">{scene.cover ? <Image src={scene.cover} alt="" width={112} height={84} quality={70} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Box className="size-5" strokeWidth={1} /></div>}</div>
    {rest.length > 0 && <span className="absolute top-1 right-1 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[0.65rem] text-foreground backdrop-blur-sm">+{rest.length}</span>}
  </Link>
}

export function PromptMatrix({ prompts, scenes }: { prompts: readonly PromptSummary[]; scenes: readonly SceneSummary[] }) {
  const { columns, rows, cells } = buildMatrix(prompts, scenes)
  if (!rows.length) return <Empty className="min-h-96 border bg-card/40"><EmptyHeader><EmptyMedia variant="icon"><GitCompareArrows /></EmptyMedia><EmptyTitle>还没有登记题目</EmptyTitle><EmptyDescription>通过管理接口登记题目并把作品关联上去后，这里会按模型与 Agent 组合展示每个题目的实现情况。</EmptyDescription></EmptyHeader></Empty>
  return <div className="overflow-x-auto rounded-xl border">
    <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
      <thead>
        <tr className="bg-card/60 text-left text-muted-foreground">
          <th scope="col" className="sticky left-0 z-10 min-w-56 border-b border-r bg-card px-4 py-3 font-medium">题目</th>
          {columns.map((column) => <th key={column.key} scope="col" className="border-b px-3 py-3 font-normal"><div className="flex flex-col gap-0.5"><span className="font-medium text-primary">{column.model || '未记录模型'}</span><span className="text-xs">{column.agent || '未记录 Agent'} · {column.count} 个</span></div></th>)}
          <th scope="col" className="border-b px-3 py-3 text-right font-normal">实现数</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ prompt, runs }, index) => <tr key={prompt.id} className={cn('group/row', index % 2 === 1 && 'bg-card/30')}>
          <th scope="row" className={cn('sticky left-0 z-10 border-r bg-background px-4 py-3 text-left font-normal align-top', index % 2 === 1 && 'bg-card')}>
            <div className="flex flex-col gap-1.5">
              <Link href={`/prompts/${prompt.slug}`} className="font-medium text-foreground transition-colors hover:text-primary">{prompt.number && <span className="mr-2 font-mono text-muted-foreground">{prompt.number}</span>}{prompt.title}</Link>
              <span className="flex flex-wrap items-center gap-1.5"><Badge variant="outline" className="h-6 text-xs">{prompt.category}</Badge>{runs > 1 && <Link href={`/prompts/${prompt.slug}`} className="inline-flex items-center gap-1 text-xs text-primary/90 hover:text-primary"><GitCompareArrows className="size-3" />对比</Link>}</span>
            </div>
          </th>
          {columns.map((column) => <td key={column.key} className="px-3 py-3 align-top"><Cell scenes={cells.get(`${prompt.id}\u0000${column.key}`)} /></td>)}
          <td className="px-3 py-3 text-right align-top font-mono text-muted-foreground">{runs}</td>
        </tr>)}
      </tbody>
    </table>
  </div>
}
