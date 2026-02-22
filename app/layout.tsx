import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import StructuredData from '../components/StructuredData'
import { ThemeProvider } from '@/components/theme-provider'
import ThemeToggle from '@/components/theme-toggle'
import Link from 'next/link'
import { Github, PenLine } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://your-domain.com'),
  title: 'AI 小红书爆款文案生成器 | 智能构思与专业排版',
  description: '由人工智能驱动的小红书文案创作引擎。结构化分析爆款核心，零门槛生成爆款标题、高质量正文与相关标签。',
  keywords: 'AI写作,小红书爆款文案,智能排版,文案生成器,自媒体工具',
  authors: [{ name: 'Creator' }],
  robots: 'index, follow',
}

// 极简顶部导航栏组件
function GlobalNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <PenLine className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight hidden sm:inline-block">
            XHS Writer <span className="text-muted-foreground font-normal ml-1">AI 写作引擎</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/EBOLABOY/xhs-ai-writer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <StructuredData />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/10 selection:text-primary`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* 全局高级背景 */}
          <div className="fixed inset-0 z-[-1] bg-background bg-grid-pattern pointer-events-none [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:[mask-image:linear-gradient(to_bottom,black,transparent)]" />

          <GlobalNavbar />

          <main className="relative flex-1">
            {children}
          </main>

          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
