import GeneratorClient from '@/components/GeneratorClient'
import { Github, Smartphone, Sparkles, Plane, Globe, Coins } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center pt-16 pb-24 px-4 sm:px-6">

      {/* 极简高级的大气 Hero Section */}
      <div className="text-center w-full max-w-4xl mx-auto mb-16 animate-fade-in z-10">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border bg-muted/50 backdrop-blur-sm text-xs font-medium text-muted-foreground shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>全新架构 · 企业级文本生成引擎</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter mb-6">
          <span className="block text-foreground">小红书内容引擎</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-neutral-600 to-neutral-400 dark:from-neutral-300 dark:to-neutral-500">
            XHS AI Writer
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed font-medium">
          基于结构化思考与高维度算法的模型架构。<br className="hidden sm:block" />
          通过对顶尖笔记的深度拆解，实时输出极具专业感与网感的高转化率文案。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://github.com/EBOLABOY/xhs-ai-writer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 h-12 px-6 rounded-lg bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors shadow-lg shadow-foreground/10"
          >
            <Github className="w-5 h-5" />
            View on GitHub
          </a>
          <a
            href="https://www.xiaohongshu.com/user/profile/5e141963000000000100158e"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 h-12 px-6 rounded-lg border bg-card text-foreground font-medium hover:bg-accent transition-colors shadow-sm"
          >
            <Smartphone className="w-5 h-5 opacity-70" />
            关注小红书
          </a>
        </div>
      </div>

      {/* 核心业务功能输入区 */}
      <div className="w-full max-w-5xl mx-auto z-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <GeneratorClient />
      </div>

      {/* 重构版极简友情链接 (Sponsors / Partners) */}
      <div className="w-full max-w-5xl mx-auto mt-24 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="border-t pt-12 pb-8 text-center flex flex-col items-center">
          <p className="text-sm font-semibold text-muted-foreground tracking-widest uppercase mb-8">
            生态伙伴 & 友链支持
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full opacity-80 hover:opacity-100 transition-opacity">
            <a
              href="https://ticketradar.izlx.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-6 rounded-xl border bg-card/50 hover-card-effect group"
            >
              <Plane className="w-6 h-6 text-muted-foreground group-hover:text-foreground mb-3 transition-colors" />
              <h4 className="font-semibold text-sm">智慧航班查询</h4>
              <p className="text-xs text-muted-foreground mt-1 text-center">Ticket Radar</p>
            </a>

            <a
              href="https://www.izlx.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-6 rounded-xl border bg-card/50 hover-card-effect group"
            >
              <Globe className="w-6 h-6 text-muted-foreground group-hover:text-foreground mb-3 transition-colors" />
              <h4 className="font-semibold text-sm">独立站应用</h4>
              <p className="text-xs text-muted-foreground mt-1 text-center">IZLX.DE</p>
            </a>

            <a
              href="https://sg.izlx.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-6 rounded-xl border bg-card/50 hover-card-effect group"
            >
              <Coins className="w-6 h-6 text-muted-foreground group-hover:text-foreground mb-3 transition-colors" />
              <h4 className="font-semibold text-sm">智能量化与交易</h4>
              <p className="text-xs text-muted-foreground mt-1 text-center">Auto Trading</p>
            </a>
          </div>

          <div className="mt-16 text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} XHS AI Writer Engine. Crafted with precision.
          </div>
        </div>
      </div>
    </div>
  )
}
