'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, ShieldAlert } from 'lucide-react'
import type { SceneRecord } from '@/lib/scenes/model'
import { hasSceneSandbox } from '@/lib/scenes/sandbox'

function HtmlSceneFrame({ src, title }: { src: string; title: string }) {
  const [status, setStatus] = useState<'checking' | 'loading' | 'loaded' | 'failed'>('checking')
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timeout = window.setTimeout(() => controller.abort(), 15_000)
    fetch(src, { method: 'HEAD', cache: 'no-store', signal: controller.signal }).then((response) => {
      if (!response.ok || !hasSceneSandbox(response.headers.get('content-security-policy') ?? '')) throw new Error('Invalid sandbox')
      if (active) setStatus('loading')
    }).catch(() => {
      if (active) setStatus('failed')
    }).finally(() => window.clearTimeout(timeout))
    return () => { active = false; window.clearTimeout(timeout); controller.abort() }
  }, [src])

  if (status === 'failed') return <div role="alert" className="flex h-full min-h-80 flex-col items-center justify-center gap-4 px-6 text-center">
    <ShieldAlert className="size-8 text-muted-foreground" />
    <p>场景暂时无法加载</p>
    <p className="max-w-md text-sm leading-7 text-muted-foreground">场景文件不可用或隔离响应头不完整。请重新加载；若使用反向代理，请保留场景的安全响应头。</p>
  </div>

  return <div className="relative h-full w-full" aria-busy={status !== 'loaded'}>
    {status !== 'checking' && <iframe
      src={src}
      title={`${title} · HTML 场景`}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      allow="camera 'none'; microphone 'none'; geolocation 'none'"
      className="h-full w-full border-0 bg-card"
      onLoad={() => setStatus('loaded')}
    />}
    {status !== 'loaded' && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 bg-card text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />正在加载场景…</div>}
  </div>
}

export function HtmlSceneViewport({ scene, resetKey = 0 }: { scene: SceneRecord; resetKey?: number }) {
  return <HtmlSceneFrame key={`${scene.id}:${scene.version}:${resetKey}`} src={`/scenes/${scene.slug}/render?v=${scene.version}`} title={scene.title} />
}
