import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const geistSans = localFont({ src: '../public/fonts/geist.woff', variable: '--font-geist-sans', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: { default: '隅境 · AI 场景档案', template: '%s · 隅境' },
  description: '收藏由提示词生长出的微小世界。走进雨夜便利店，漫游真实可交互的三维场景，阅读每个作品的创作记录。',
  applicationName: '隅境',
  keywords: ['AI 场景', '3D 作品集', '微缩场景', '雨夜便利店', 'Three.js'],
  openGraph: {
    title: '隅境 · 每一个想象，都有一处归所',
    description: '一个关于 AI、代码与微小世界的场景档案。',
    locale: 'zh_CN',
    type: 'website',
    images: [{ url: '/images/rainy-konbini.png', width: 1440, height: 1000, alt: '雨夜便利店三维作品实景' }],
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0c1216',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`dark bg-background ${geistSans.variable}`}>
      <body className="min-h-svh font-sans antialiased">{children}</body>
    </html>
  )
}
