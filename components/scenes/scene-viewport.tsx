'use client'

import dynamic from 'next/dynamic'
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react'
import { LoaderCircle, MonitorOff, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SceneCanvasProps } from './scene-canvas'

const SceneCanvas = dynamic(() => import('./scene-canvas'), { ssr: false })

class SceneBoundary extends Component<{ children: ReactNode; onRetry: () => void; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() {
    if (this.state.failed) return <SceneFailure retry={this.props.onRetry} />
    return this.props.children
  }
}

function SceneFailure({ retry }: { retry: () => void }) {
  return <div role="alert" className="flex h-full min-h-80 flex-col items-center justify-center gap-4 px-6 text-center">
    <MonitorOff className="size-8 text-muted-foreground" aria-hidden="true" />
    <p className="text-base">暂时无法渲染这个世界</p>
    <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">请使用支持 WebGL 2 的浏览器并开启硬件加速。也可以切换浏览器，或重新载入场景。</p>
    <Button variant="outline" onClick={retry}><RotateCcw data-icon="inline-start" />重新载入</Button>
  </div>
}

export function SceneViewport(props: Omit<SceneCanvasProps, 'onReady' | 'onFailure'>) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [supported, setSupported] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const onReady = useCallback(() => setReady(true), [])
  const onFailure = useCallback(() => { setReady(false); setFailed(true) }, [])
  const retry = () => { setFailed(false); setReady(false); setSupported(false); setAttempt((value) => value + 1) }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = document.createElement('canvas')
      try {
        const context = canvas.getContext('webgl2')
        if (!context) { onFailure(); return }
        context.getExtension('WEBGL_lose_context')?.loseContext()
        setSupported(true)
      } catch { onFailure() }
    })
    return () => cancelAnimationFrame(frame)
  }, [attempt, onFailure])

  return (
    <div className="relative h-full w-full" data-scene-ready={ready ? 'true' : 'false'} aria-busy={!ready && !failed}>
      {failed ? <SceneFailure retry={retry} /> : <SceneBoundary key={attempt} onRetry={retry} onFailure={onFailure}>
        {supported && <SceneCanvas {...props} onReady={onReady} onFailure={onFailure} />}
        {!ready && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card text-card-foreground"><div className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />正在点亮街角的灯…</div></div>}
      </SceneBoundary>}
    </div>
  )
}
