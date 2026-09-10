'use client'

import { useId, useRef, useState } from 'react'
import { Code2, Download, FileUp, LoaderCircle, Play, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { MAX_HTML_BYTES, validateHtml } from '@/lib/scenes/draft'
import { downloadText } from '@/lib/scenes/files'

export function HtmlPreview({ html, onChange, slug }: { html: string; onChange: (html: string) => void; slug: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const frameName = `scene-preview-${id}`
  const [submitted, setSubmitted] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  async function runPreview(form: HTMLFormElement) {
    const problem = validateHtml(html)
    if (problem) { setError(problem); return }
    setChecking(true)
    setError('')
    try {
      const response = await fetch('/api/preview', { method: 'HEAD', cache: 'no-store' })
      const policy = response.headers.get('content-security-policy') ?? ''
      if (!response.ok || !policy.includes('sandbox allow-scripts') || !policy.includes("connect-src 'none'")) {
        throw new Error('当前预览环境未保留必要的隔离策略，已阻止运行。请在部署后的站点使用此功能。')
      }
      setSubmitted(true)
      form.submit()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法核验隔离策略，请重试。')
    } finally { setChecking(false) }
  }
  const fileInput = useRef<HTMLInputElement>(null)
  return <div className="flex flex-col gap-6">
    <FieldGroup><Field data-invalid={Boolean(error)}><FieldLabel htmlFor={`source-${id}`}>独立场景 HTML</FieldLabel><Textarea id={`source-${id}`} className="min-h-80 max-h-[32rem] field-sizing-fixed resize-y font-mono" rows={12} spellCheck={false} aria-invalid={Boolean(error)} value={html} onChange={(event) => { onChange(event.target.value); setError('') }} placeholder={'<!doctype html>\n<html lang="zh-CN">\n  <!-- 粘贴已打包的独立场景代码 -->\n</html>'} /><FieldDescription>JS、CSS 和资源需内嵌。HTML 限制 4 MB；不运行 npm 构建，不加载外部脚本或模型。</FieldDescription>{error && <FieldError>{error}</FieldError>}</Field></FieldGroup>
    <input ref={fileInput} type="file" accept=".html,.htm,text/html" className="sr-only" tabIndex={-1} aria-label="导入场景 HTML" onChange={async (event) => {
      const file = event.target.files?.[0]
      if (!file) return
      try {
        if (file.size > MAX_HTML_BYTES) throw new Error('HTML 文件不能超过 4 MB。')
        const text = await file.text()
        const problem = validateHtml(text)
        if (problem) throw new Error(problem)
        onChange(text); setError(''); toast.success('HTML 已导入当前页面，尚未执行。')
      } catch (reason) { setError(reason instanceof Error ? reason.message : '无法导入文件。') }
      event.target.value = ''
    }} />
    <div className="flex flex-wrap items-center gap-3"><Button variant="outline" onClick={() => fileInput.current?.click()}><FileUp data-icon="inline-start" />导入 HTML</Button><Button variant="outline" disabled={!html.trim()} onClick={() => downloadText(`${slug || 'scene'}.html`, html, 'text/html')}><Download data-icon="inline-start" />下载源码</Button><form action="/api/preview" method="post" encType="multipart/form-data" target={frameName} onSubmit={(event) => { event.preventDefault(); void runPreview(event.currentTarget) }}><input type="hidden" name="html" value={html} /><Button type="submit" disabled={checking}>{checking ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Play data-icon="inline-start" />}{checking ? '核验隔离策略…' : submitted ? '重新运行预览' : '运行隔离预览'}</Button></form></div>
    <div className="overflow-hidden rounded-lg border"><div className="border-b p-4"><div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="font-medium">隔离画布</span><span className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="size-4" />无父页面权限 · 禁止外部连接</span></div></div>{!submitted && <Empty className="min-h-72"><EmptyHeader><EmptyMedia variant="icon"><Code2 /></EmptyMedia><EmptyTitle>让场景在安全的画布里运行</EmptyTitle><EmptyDescription>导入文件后，点击「运行隔离预览」。代码不会保存到服务器，也不会出现在公开展厅。</EmptyDescription></EmptyHeader></Empty>}<iframe name={frameName} title="用户 HTML 场景隔离预览" sandbox="allow-scripts" referrerPolicy="no-referrer" allow="camera 'none'; microphone 'none'; geolocation 'none'" className="aspect-[4/3] w-full border-0 bg-card text-card-foreground" hidden={!submitted} /></div>
    <p className="text-sm leading-7 text-muted-foreground">预览使用不透明来源沙箱，不能读取父页面、打开弹窗、提交表单或访问网络。收到页面响应不代表场景渲染成功；请以画布中的实际效果为准。沙箱不是恶意程序分析工具；请勿在浏览器中直接打开下载的未知 HTML。预览前会核验隔离响应头，不满足要求时不会执行。</p>
  </div>
}
