import GeneratorClient from '@/components/GeneratorClient'
import { Github, Smartphone, Zap, Sparkles, Plane, Globe, Coins, Link, Flame } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900 relative overflow-hidden transition-colors duration-500">
      {/* 背景装饰 - 增加深色模式适配 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 dark:from-blue-600/10 dark:to-indigo-500/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen transition-colors duration-500"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-purple-200/30 dark:from-indigo-600/10 dark:to-purple-500/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen transition-colors duration-500"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-slate-200/30 to-blue-200/30 dark:from-slate-800/20 dark:to-blue-800/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen transition-colors duration-500"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2.5 mb-6 px-4 py-2 bg-gradient-to-r from-blue-100/80 to-indigo-100/80 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full border border-blue-200/50 dark:border-blue-700/30 backdrop-blur-sm shadow-sm transition-colors duration-300">
              <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-pulse" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI 驱动的爆款文案工厂</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-5 bg-gradient-to-r from-slate-900 via-blue-700 to-indigo-700 dark:from-white dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent leading-tight tracking-tight">
              小红书爆款文案生成器
            </h1>
            <p className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto font-medium">
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-500" /> 智能分析热门笔记规律</span>
              <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-indigo-500" /> 实时生成专属爆款文案</span>
              <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /> 助力内容快速出圈</span>
            </p>
            <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
              <a
                href="https://github.com/EBOLABOY/xhs-ai-writer"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-2.5 px-6 py-3 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <Github className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                <span>GitHub</span>
              </a>
              <a
                href="https://www.xiaohongshu.com/user/profile/5e141963000000000100158e"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-2.5 px-6 py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-300 shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/40 transform hover:-translate-y-0.5"
              >
                <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                <span>小红书</span>
              </a>
            </div>
          </div>
        </div>

        <GeneratorClient />
      </div>

      {/* 底部友链栏 */}
      <div className="relative z-10 mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-effect-neutral dark:bg-slate-900/60 rounded-2xl p-6 sm:p-8 transition-colors duration-500">
            <div className="text-center mb-8">
              <h3 className="flex items-center justify-center gap-2 text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                <Link className="w-5 h-5 text-blue-600 dark:text-blue-400" /> 友情链接
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                推荐一些优质的工具和服务
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              <a
                href="https://ticketradar.izlx.de/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-5 glass-effect dark:glass-effect-neutral rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    智慧航班
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    航班信息查询服务
                  </p>
                </div>
              </a>

              <a
                href="https://www.izlx.de/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-5 glass-effect dark:glass-effect-neutral rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                    独立站
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    个人独立网站服务
                  </p>
                </div>
              </a>

              <a
                href="https://sg.izlx.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-5 glass-effect dark:glass-effect-neutral rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-1"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                    虚拟货币自动交易
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    智能交易系统服务
                  </p>
                </div>
              </a>
            </div>

            <div className="mt-6 pt-4 border-t border-blue-200/30 text-center">
              <p className="text-xs sm:text-sm text-gray-500">
                © 2024 小红书爆款文案生成器 · 由 AI 驱动的内容创作工具
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
