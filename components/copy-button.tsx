'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function CopyButton({ text, label = '复制', variant = 'outline' }: { text: string; label?: string; variant?: 'outline' | 'ghost' | 'secondary' }) {
  const [copied, setCopied] = useState(false)
  return <Button variant={variant} onClick={async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); toast.success('已复制到剪贴板') }
    catch { toast.error('浏览器未允许复制，请手动选择文本。') }
  }}>{copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}<span aria-live="polite">{copied ? '已复制' : label}</span></Button>
}

export function ShareButton({ title }: { title: string }) {
  return <Button variant="outline" onClick={async () => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('from')
      if (navigator.share) await navigator.share({ title: `${title} · 隅境`, url: url.href })
      else { await navigator.clipboard.writeText(url.href); toast.success('作品链接已复制') }
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) toast.error('暂时无法分享，请复制浏览器地址。') }
  }}><Share2 data-icon="inline-start" />分享作品</Button>
}
