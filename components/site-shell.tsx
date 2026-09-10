'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Box, Menu, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'

export function SiteHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [{ href: '/', title: '场景展厅' }, { href: '/about', title: '关于隅境' }]
  return (
    <header className="border-b border-border/70">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:bg-primary focus:p-3 focus:text-primary-foreground">跳转到主要内容</a>
      <div className="page-shell">
        <div className="flex h-20 items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3" aria-label="隅境，返回展厅">
            <span className="flex size-10 items-center justify-center rounded-lg border border-primary/40 text-primary"><Box className="size-6" strokeWidth={1.3} /></span>
            <span className="flex items-baseline gap-3"><span className="text-2xl font-medium tracking-widest">隅境</span><span className="hidden text-sm text-muted-foreground sm:inline">AI 场景档案</span></span>
          </Link>
          <nav className="hidden items-center gap-9 md:flex" aria-label="主导航">
            {links.map((link) => <Link key={link.href} href={link.href} aria-current={(pathname === link.href || link.href === '/' && pathname.startsWith('/scenes/')) ? 'page' : undefined} className="quiet-link aria-[current=page]:text-foreground">{link.title}</Link>)}
          </nav>
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="打开导航" />}><Menu /></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>隅境 · 导航</DialogTitle></DialogHeader>
              <nav className="flex flex-col gap-5" aria-label="移动端导航" onClick={(event) => { if ((event.target as Element).closest('a')) setMenuOpen(false) }}>{links.map((link) => <Link key={link.href} href={link.href} className="quiet-link">{link.title}</Link>)}</nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return <footer className="border-t border-border/70">
    <div className="page-shell py-8">
      <div className="flex flex-col justify-between gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p>隅境 <span className="mx-2 text-border">/</span> 收藏想象，也收藏创造的过程。</p>
        <div className="flex items-center gap-6"><Link href="/about" className="quiet-link">关于这个档案</Link><span className="font-mono">© 2026</span></div>
      </div>
    </div>
  </footer>
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader />{children}<SiteFooter /><Toaster theme="dark" position="bottom-right" /></>
}

export function BackToGallery({ href = '/' }: { href?: string }) {
  return <Link href={href} className="quiet-link inline-flex items-center gap-2"><ArrowLeft className="size-4" />返回场景展厅</Link>
}
