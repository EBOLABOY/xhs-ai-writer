import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import StructuredData from '../components/StructuredData'
import { ThemeProvider } from '@/components/theme-provider'
import ThemeToggle from '@/components/theme-toggle'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://your-domain.com'), // 请替换为您的实际域名
  title: 'AI小红书爆款文案生成器 - 智能分析与一键创作工具',
  description: '使用AI小红书爆款文案生成器，通过智能分析热门笔记，一键创作出充满"人味"的高质量标题、正文和标签，轻松提升您的笔记流量。支持多种内容类型，包括穿搭、美食、旅行、职场等。',
  keywords: 'AI小红书文案生成器,小红书爆款文案,小红书AI写作,小红书标题生成,小红书文案工具,AI写作助手,小红书营销工具',
  authors: [{ name: 'AI小红书爆款文案生成器' }],
  creator: 'AI小红书爆款文案生成器',
  publisher: 'AI小红书爆款文案生成器',
  robots: 'index, follow',
  openGraph: {
    title: 'AI小红书爆款文案生成器 - 智能分析与一键创作工具',
    description: '使用AI小红书爆款文案生成器，通过智能分析热门笔记，一键创作出充满"人味"的高质量标题、正文和标签，轻松提升您的笔记流量。',
    type: 'website',
    locale: 'zh_CN',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'AI小红书爆款文案生成器 - 智能分析与一键创作工具',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI小红书爆款文案生成器 - 智能分析与一键创作工具',
    description: '使用AI小红书爆款文案生成器，通过智能分析热门笔记，一键创作出充满"人味"的高质量标题、正文和标签，轻松提升您的笔记流量。',
    images: ['/og-image.svg'],
  },
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
      <body className={`${inter.className} antialiased selection:bg-blue-200/50 selection:text-blue-900 dark:selection:bg-blue-800/30 dark:selection:text-blue-100`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <ThemeToggle />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
