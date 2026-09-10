import Link from 'next/link'
import { ArrowLeft, Box } from 'lucide-react'
import { SiteShell } from '@/components/site-shell'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return <SiteShell><main id="main-content" className="page-shell py-24"><div className="flex min-h-80 flex-col items-center justify-center gap-6 text-center"><Box className="size-10 text-primary" strokeWidth={1.2} /><p className="font-mono text-sm text-muted-foreground">404</p><h1 className="text-3xl font-medium text-balance">这个角落，还没有被发现。</h1><p className="text-sm leading-7 text-muted-foreground">作品可能不存在，或链接地址有误。<br />回到展厅，看看已经点亮的世界。</p><Link href="/" className={cn(buttonVariants({ variant: 'outline' }), 'h-11')}><ArrowLeft data-icon="inline-start" />返回场景展厅</Link></div></main></SiteShell>
}
