'use client'

import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center"><h1 className="text-2xl font-medium">这个世界暂时没有载入</h1><p className="max-w-md text-sm leading-7 text-muted-foreground">可以重新尝试，或返回展厅。当前页面中未导出的修改可能无法恢复。</p><div className="flex items-center gap-3"><Button onClick={reset}><RotateCcw data-icon="inline-start" />重新尝试</Button><Link href="/" className={buttonVariants({ variant: 'outline' })}>返回展厅</Link></div></main>
}
