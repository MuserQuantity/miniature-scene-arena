'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileUp, ImagePlus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { HtmlPreview } from './html-preview'
import { OfflineNotice } from './admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Separator } from '@/components/ui/separator'
import { createDraft, MAX_DRAFT_BYTES, MAX_HTML_BYTES, sceneDraftSchema, validateHtml, type SceneDraft } from '@/lib/scenes/draft'
import { downloadText, readCover, resolveCover } from '@/lib/scenes/files'
import type { SceneRecord } from '@/lib/scenes/catalog'

function TextField({ label, field, value, set, error, help, placeholder }: { label: string; field: string; value: string; set: (value: string) => void; error?: string; help?: string; placeholder?: string }) {
  return <Field data-invalid={Boolean(error)}><FieldLabel htmlFor={`draft-${field}`}>{label}</FieldLabel><Input id={`draft-${field}`} value={value} onChange={(event) => set(event.target.value)} aria-invalid={Boolean(error)} placeholder={placeholder} />{help && <FieldDescription>{help}</FieldDescription>}{error && <FieldError>{error}</FieldError>}</Field>
}

export function SceneEditor({ scene }: { scene?: SceneRecord }) {
  const router = useRouter()
  const [draft, setDraft] = useState<SceneDraft>(() => createDraft(scene))
  const [tags, setTags] = useState(scene?.tags.join('，') ?? '')
  const [parameters, setParameters] = useState('{}')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [leaveHref, setLeaveHref] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('details')
  const [exporting, setExporting] = useState(false)
  const [pendingImport, setPendingImport] = useState<SceneDraft | null>(null)
  const editVersion = useRef(0)

  function markDirty() {
    editVersion.current += 1
    setDirty(true)
  }

  function applyImport(next: SceneDraft) {
    setDraft(next)
    setTags(next.tags.join('，'))
    setParameters(JSON.stringify(next.parameters, null, 2))
    markDirty()
    setErrors({})
    setPendingImport(null)
    toast.success('资料已导入当前页面，未上传或发布。')
  }
  const importFile = useRef<HTMLInputElement>(null)
  const coverFile = useRef<HTMLInputElement>(null)

  function change<K extends keyof SceneDraft>(key: K, value: SceneDraft[K]) {
    setDraft((old) => ({ ...old, [key]: value }))
    setErrors((old) => ({ ...old, [key]: '' }))
    markDirty()
  }

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const beforeLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.('a[href]') as HTMLAnchorElement | null
      if (!link || link.download || link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
      const destination = new URL(link.href, window.location.href)
      if (destination.origin === window.location.origin && destination.pathname !== window.location.pathname) { event.preventDefault(); event.stopPropagation(); setLeaveHref(destination.pathname + destination.search) }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', beforeLink, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', beforeLink, true) }
  }, [dirty])

  async function exportDraft() {
    if (exporting) return
    const version = editVersion.current
    let parsedParameters: unknown
    try { parsedParameters = JSON.parse(parameters) }
    catch { setErrors({ parameters: '参数必须是有效的 JSON 对象。' }); setActiveTab('generation'); toast.error('请检查自定义参数。'); return }
    const result = sceneDraftSchema.safeParse({ ...draft, tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean), parameters: parsedParameters })
    if (!result.success) {
      const next: Record<string, string> = {}
      for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message
      setErrors(next)
      setActiveTab(next.html || next.renderer ? 'code' : ['parameters', 'model', 'modelVersion', 'agent', 'agentVersion', 'thinking'].some((field) => next[field]) ? 'generation' : 'details')
      toast.error('请先修正标记的资料字段。')
      return
    }
    if (draft.renderer === 'html') {
      const problem = validateHtml(draft.html)
      if (problem) { setErrors({ html: problem }); setActiveTab('code'); toast.error(problem); return }
    }
    setExporting(true)
    try {
      const cover = await resolveCover(result.data.cover)
      const contents = JSON.stringify({ ...result.data, cover }, null, 2)
      if (new Blob([contents]).size > MAX_DRAFT_BYTES) throw new Error('完整资料包不能超过 8 MB，请缩减封面、HTML 或其他生成参数。')
      downloadText(`${result.data.slug}.scene.json`, contents)
      if (editVersion.current === version) setDirty(false)
      toast.success('已生成包含封面的资料文件；公开展厅未发生变化。')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : '导出失败，请重试。')
    } finally { setExporting(false) }
  }

  async function importDraft(file: File) {
    if (file.size > MAX_DRAFT_BYTES) throw new Error('资料包不能超过 8 MB。')
    const result = sceneDraftSchema.safeParse(JSON.parse(await file.text()))
    if (!result.success) throw new Error('资料包格式不正确，请使用此工作台导出的 .scene.json 文件。')
    if (new TextEncoder().encode(result.data.html).byteLength > MAX_HTML_BYTES) throw new Error('资料包中的 HTML 不能超过 4 MB。')
    const next = { ...result.data, cover: await resolveCover(result.data.cover) }
    if (dirty) setPendingImport(next)
    else applyImport(next)
  }

  return <div className="flex flex-col gap-7">
    <Link href="/admin" className="quiet-link inline-flex w-fit items-center gap-2"><ArrowLeft className="size-4" />场景资料</Link>
    <header className="flex flex-wrap items-start justify-between gap-4"><div className="flex flex-col gap-3"><h1 className="text-2xl font-medium tracking-tight">{scene ? '编辑作品副本' : '新建资料文件'}</h1><p className="text-sm text-muted-foreground">{dirty ? '有尚未导出的修改，关闭页面前请保存文件。' : '仅当前页面可见，不会自动保存。'}</p></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => importFile.current?.click()}><FileUp data-icon="inline-start" />导入资料</Button><Button onClick={exportDraft} disabled={exporting}><Download data-icon="inline-start" />{exporting ? '正在准备文件…' : '验证并导出'}</Button></div></header>
    <OfflineNotice />
    <input ref={importFile} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="导入作品 JSON" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { try { await importDraft(file) } catch (reason) { toast.error(reason instanceof Error ? reason.message : '导入失败。') } } event.target.value = '' }} />
    <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_15rem]">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))} className="min-w-0"><TabsList variant="line"><TabsTrigger value="details">基本资料</TabsTrigger><TabsTrigger value="generation">生成记录</TabsTrigger><TabsTrigger value="code">场景程序</TabsTrigger></TabsList><Separator className="my-3" />
        <TabsContent value="details"><FieldGroup>
          <TextField label="作品标题" field="title" value={draft.title} set={(value) => change('title', value)} error={errors.title} placeholder="为这个世界起个名字" />
          <TextField label="作品地址" field="slug" value={draft.slug} set={(value) => change('slug', value)} error={errors.slug} help="使用小写英文、数字和中划线，例如 rainy-night-konbini。" />
          <TextField label="一句话介绍" field="subtitle" value={draft.subtitle} set={(value) => change('subtitle', value)} error={errors.subtitle} />
          <Field data-invalid={Boolean(errors.description)}><FieldLabel htmlFor="draft-description">场景简介</FieldLabel><Textarea id="draft-description" rows={3} value={draft.description} onChange={(event) => change('description', event.target.value)} aria-invalid={Boolean(errors.description)} />{errors.description && <FieldError>{errors.description}</FieldError>}</Field>
          <TextField label="标签" field="tags" value={tags} set={(value) => { setTags(value); markDirty(); setErrors((old) => ({ ...old, tags: '' })) }} error={errors.tags} help="用逗号分隔，最多 12 个标签。" />
          <Field data-invalid={Boolean(errors.prompt)}><FieldLabel htmlFor="draft-prompt">创作提示词</FieldLabel><Textarea id="draft-prompt" className="min-h-64" rows={10} value={draft.prompt} onChange={(event) => change('prompt', event.target.value)} aria-invalid={Boolean(errors.prompt)} /><FieldDescription>支持完整长提示词。请保留原文，不要把整理稿标为逐字记录。</FieldDescription>{errors.prompt && <FieldError>{errors.prompt}</FieldError>}</Field>
          <TextField label="提示词来源说明" field="promptSource" value={draft.promptSource} set={(value) => change('promptSource', value)} error={errors.promptSource} />
          <Field data-invalid={Boolean(errors.notes)}><FieldLabel htmlFor="draft-notes">制作备注</FieldLabel><Textarea id="draft-notes" rows={4} value={draft.notes} onChange={(event) => change('notes', event.target.value)} aria-invalid={Boolean(errors.notes)} />{errors.notes && <FieldError>{errors.notes}</FieldError>}</Field>
        </FieldGroup></TabsContent>
        <TabsContent value="generation"><FieldGroup>
          <TextField label="模型名称 / 供应商" field="model" value={draft.model} set={(value) => change('model', value)} error={errors.model} help="仅填写可以核实的信息；未知时可留空或填写「未披露」。" />
          <TextField label="模型版本" field="modelVersion" value={draft.modelVersion} set={(value) => change('modelVersion', value)} error={errors.modelVersion} />
          <TextField label="思考强度 / Thinking Effort" field="thinking" value={draft.thinking} set={(value) => change('thinking', value)} error={errors.thinking} />
          <TextField label="Coding Agent" field="agent" value={draft.agent} set={(value) => change('agent', value)} error={errors.agent} />
          <TextField label="Agent 版本" field="agentVersion" value={draft.agentVersion} set={(value) => change('agentVersion', value)} error={errors.agentVersion} />
          <Field data-invalid={Boolean(errors.parameters)}><FieldLabel htmlFor="draft-parameters">其他生成参数 · JSON</FieldLabel><Textarea id="draft-parameters" className="min-h-44 font-mono" spellCheck={false} value={parameters} onChange={(event) => { setParameters(event.target.value); markDirty(); setErrors((old) => ({ ...old, parameters: '' })) }} aria-invalid={Boolean(errors.parameters)} /><FieldDescription>记录 temperature、thinking budget 等实际参数。此处只记录资料，不会调用 AI 模型或改变三维画面。</FieldDescription>{errors.parameters && <FieldError>{errors.parameters}</FieldError>}</Field>
        </FieldGroup></TabsContent>
        <TabsContent value="code"><div className="flex flex-col gap-6"><FieldGroup><Field><FieldLabel>场景来源</FieldLabel><ToggleGroup variant="outline" value={[draft.renderer]} onValueChange={(values) => values.length && change('renderer', values[0] as SceneDraft['renderer'])} aria-label="场景程序来源"><ToggleGroupItem value="rainy-konbini">内置雨夜便利店</ToggleGroupItem><ToggleGroupItem value="html">独立 HTML</ToggleGroupItem></ToggleGroup></Field></FieldGroup>{draft.renderer === 'rainy-konbini' ? <div className="content-panel p-6"><div className="flex flex-col gap-4"><h2 className="text-base font-medium">受信任的内置渲染器</h2><p className="text-sm leading-7 text-muted-foreground">雨夜便利店由项目中的 React Three Fiber 组件渲染。程序源码随项目部署更新，不提供虚假的单文件 HTML 导出。切换为「独立 HTML」可导入其他已打包程序。</p><Link href="/scenes/rainy-night-konbini" target="_blank" rel="noopener noreferrer" className="quiet-link underline underline-offset-4">在新标签页查看内置场景</Link></div></div> : <HtmlPreview html={draft.html} slug={draft.slug} onChange={(value) => change('html', value)} />}{errors.html && <p role="alert" className="text-sm">{errors.html}</p>}</div></TabsContent>
      </Tabs>
      <aside className="flex flex-col gap-5" aria-label="封面与导出状态"><section className="content-panel overflow-hidden"><div className="p-4"><h2 className="text-sm font-medium">封面预览</h2></div>{draft.cover ? <Image src={draft.cover} alt={draft.title || '作品封面'} width={400} height={280} unoptimized className="aspect-[10/7] w-full object-cover" /> : <div className="flex aspect-[10/7] items-center justify-center bg-card text-muted-foreground"><ImagePlus className="size-8" /></div>}<div className="p-4"><div className="flex flex-col gap-4"><p className="text-base font-medium text-pretty">{draft.title || '尚未命名的场景'}</p><Button variant="outline" onClick={() => coverFile.current?.click()}><ImagePlus data-icon="inline-start" />选择本地封面</Button><p className="text-sm leading-relaxed text-muted-foreground">PNG / JPEG / WebP<br />最大 2 MB，不会上传。</p></div></div><input ref={coverFile} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-label="选择封面图像" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { try { change('cover', await readCover(file)) } catch (reason) { toast.error(reason instanceof Error ? reason.message : '无法读取封面。') } } event.target.value = '' }} /></section><div className="content-panel p-4"><div className="flex flex-col gap-4"><Badge variant="outline">仅本次会话</Badge><p className="text-sm leading-relaxed text-muted-foreground">JSON 文件包含资料、封面及导入的 HTML，可随时重新导入。</p></div></div><Button variant="ghost" onClick={() => setResetOpen(true)}><RotateCcw data-icon="inline-start" />重置编辑内容</Button></aside>
    </div>
    <Dialog open={Boolean(pendingImport)} onOpenChange={(open) => !open && setPendingImport(null)}><DialogContent><DialogHeader><DialogTitle>用导入文件替换当前资料？</DialogTitle><DialogDescription>当前页面还有尚未导出的修改。替换后将使用导入文件的全部资料，公开展厅不会变化。</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setPendingImport(null)}>保留当前修改</Button><Button onClick={() => { if (pendingImport) applyImport(pendingImport) }}>确认替换资料</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={resetOpen} onOpenChange={setResetOpen}><DialogContent><DialogHeader><DialogTitle>重置当前编辑内容？</DialogTitle><DialogDescription>尚未导出的修改会丢失。内置作品和已下载文件不会受到影响。</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setResetOpen(false)}>继续编辑</Button><Button onClick={() => { setDraft(createDraft(scene)); setTags(scene?.tags.join('，') ?? ''); setParameters('{}'); setErrors({}); setDirty(false); setResetOpen(false) }}>确认重置</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(leaveHref)} onOpenChange={(open) => !open && setLeaveHref(null)}><DialogContent><DialogHeader><DialogTitle>还有尚未导出的修改</DialogTitle><DialogDescription>离开后，当前页面的修改不会保留。请先返回编辑器导出资料，或确认放弃修改。</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setLeaveHref(null)}>返回编辑</Button><Button onClick={() => { const href = leaveHref; setDirty(false); setLeaveHref(null); if (href) router.push(href) }}>放弃修改并离开</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
