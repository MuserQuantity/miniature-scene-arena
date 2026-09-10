'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, FilePlus, FolderOpen, HardDriveDownload } from 'lucide-react'
import { SiteShell } from '@/components/site-shell'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export function OfflineNotice() {
  return <Alert>
    <HardDriveDownload />
    <AlertTitle>本地编辑 · 以文件保存</AlertTitle>
    <AlertDescription>修改仅保留在当前页面，请导出资料文件保存，下次可重新导入。此工作台不提供在线保存或发布，不会修改公开展厅。</AlertDescription>
  </Alert>
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const nav = [
    { href: '/admin', label: '场景资料', icon: FolderOpen },
    { href: '/admin/scenes/new', label: '新建资料', icon: FilePlus },
  ]
  return <SiteShell footer={false}>
    <div className="page-shell">
      <div className="flex min-h-[calc(100svh-5rem)] flex-col gap-8 py-8 md:flex-row md:gap-10 md:py-10">
        <aside className="flex shrink-0 flex-col gap-6 md:w-44" aria-label="工作台导航">
          <div className="hidden flex-col gap-3 md:flex"><p className="text-sm font-medium">资料工作台</p><Badge variant="outline">本地模式</Badge></div>
          <nav className="flex flex-wrap gap-1 md:flex-col">
            {nav.map((item) => {
              const active = path === item.href || item.href === '/admin' && path.startsWith('/admin/scenes/') && path !== '/admin/scenes/new'
              return <Link key={item.href} href={item.href} className="admin-nav-link" aria-current={active ? 'page' : undefined}><item.icon className="size-4" />{item.label}</Link>
            })}
          </nav>
          <Separator className="hidden md:block" />
          <div className="hidden flex-col gap-3 text-sm leading-relaxed text-muted-foreground md:flex">
            <HardDriveDownload className="size-5" />
            <p>将灵感整理成档案，<br />以文件保存每次创作。</p>
            <Link href="/" className="quiet-link inline-flex items-center gap-2">浏览公开展厅<ArrowUpRight className="size-4" /></Link>
          </div>
        </aside>
        <main id="main-content" className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  </SiteShell>
}
