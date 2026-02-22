'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  ArrowUp,
  Check,
  Clipboard,
  RefreshCw,
  Sparkles,
  Zap,
  Search,
  BarChart3,
  AlertTriangle,
  FileText,
  Tags,
  TrendingUp,
  PartyPopper,
  ImagePlus,
  MessageCircle,
  Lightbulb,
  Calendar,
  Clock,
  Rocket,
  MessageSquare,
  Loader2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { GeneratedContent } from '@/lib/types'

function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 dark:from-blue-600/10 dark:to-indigo-500/10 rounded-full blur-3xl animate-float mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" style={{ animationDelay: '0s' }}></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-indigo-200/30 to-purple-200/30 dark:from-indigo-600/10 dark:to-purple-500/10 rounded-full blur-3xl animate-float mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-gradient-to-r from-slate-200/30 to-blue-200/30 dark:from-slate-800/20 dark:to-blue-800/10 rounded-full blur-3xl animate-float mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" style={{ animationDelay: '4s' }}></div>
    </div>
  );
}

const titleRegex = /##\s*1[.、]?\s*(爆款标题创作|标题|生成标题)(\s*（\d+个）)?/i;
const bodyRegex = /##\s*2[.、]?\s*(正文内容|笔记正文|内容|正文|文案内容)/i;
const tagsRegex = /##\s*3[.、]?\s*(关键词标签|标签|关键词)(\s*（\d+-\d+个）)?/i;
const imagePromptRegex = /##\s*4[.、]?\s*(AI绘画提示词|绘画提示词|AI绘画|绘画提示)/i;
const selfCommentRegex = /##\s*5[.、]?\s*(首评关键词引导|首评)/i;
const strategyRegex = /##\s*6[.、]?\s*(发布策略建议|发布策略)/i;
const playbookRegex = /##\s*7[.、]?\s*(小红书增长 Playbook|增长 Playbook)/i;

const EMPTY_GENERATED_CONTENT: GeneratedContent = {
  titles: '',
  body: '',
  tags: [],
  imagePrompt: '',
  selfComment: '',
  strategy: '',
  playbook: ''
}

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState('preparing')
  const [error, setError] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showRegeneratePrompt, setShowRegeneratePrompt] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>(EMPTY_GENERATED_CONTENT)

  // 新增一个 state 来追踪哪个按钮被点击了
  const [copiedButtonId, setCopiedButtonId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 流式生成相关状态
  const [displayContent, setDisplayContent] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationSequenceRef = useRef(0);

  // 解析内容的函数
  const parseContent = useCallback((content: string) => {
    // 查找各部分的位置
    const titleMatch = content.match(titleRegex);
    const bodyMatch = content.match(bodyRegex);
    const tagsMatch = content.match(tagsRegex);
    const imagePromptMatch = content.match(imagePromptRegex);
    const selfCommentMatch = content.match(selfCommentRegex);
    const strategyMatch = content.match(strategyRegex);
    const playbookMatch = content.match(playbookRegex);

    // 创建位置数组并排序
    const sections = [
      { name: 'title', match: titleMatch, index: titleMatch?.index ?? -1 },
      { name: 'body', match: bodyMatch, index: bodyMatch?.index ?? -1 },
      { name: 'tags', match: tagsMatch, index: tagsMatch?.index ?? -1 },
      { name: 'imagePrompt', match: imagePromptMatch, index: imagePromptMatch?.index ?? -1 },
      { name: 'selfComment', match: selfCommentMatch, index: selfCommentMatch?.index ?? -1 },
      { name: 'strategy', match: strategyMatch, index: strategyMatch?.index ?? -1 },
      { name: 'playbook', match: playbookMatch, index: playbookMatch?.index ?? -1 }
    ].filter(section => section.index !== -1).sort((a, b) => a.index - b.index);

    // 初始化内容变量
    let titles = '';
    let body = '';
    let tags: string[] = [];
    let imagePrompt = '';
    let selfComment = '';
    let strategy = '';
    let playbook = '';

    if (sections.length === 0) {
      // 如果一个标记都找不到，所有内容都暂时视为标题
      titles = content;
    } else {
      // 检查第一个标记之前是否有内容
      const firstSectionIndex = sections[0].index;
      if (firstSectionIndex > 0) {
        // 第一个标记之前的内容作为标题
        titles = content.substring(0, firstSectionIndex).trim();
      }
    }

    // 循环解析每个已识别的部分
    for (let i = 0; i < sections.length; i++) {
      const currentSection = sections[i];
      const nextSection = sections[i + 1];

      // 计算当前部分的开始和结束位置
      const startIndex = currentSection.index + (currentSection.match?.[0].length || 0);
      const endIndex = nextSection ? nextSection.index : content.length;

      const sectionContent = content.substring(startIndex, endIndex).trim();

      switch (currentSection.name) {
        case 'title':
          titles = sectionContent;
          break;
        case 'body':
          body = sectionContent;
          break;
        case 'tags':
          const tagMatches = sectionContent.match(/#[\u4e00-\u9fa5a-zA-Z0-9_]+/g) || [];
          const listTagMatches = sectionContent.match(/[-*]\s*([^\n]+)/g) || [];
          const extractedTags = [
            ...tagMatches.map(tag => tag.replace(/^#/, '')), // 移除#号
            ...listTagMatches.map(item => item.replace(/[-*]\s*/, '').trim())
          ];
          tags = Array.from(new Set(extractedTags)).filter(Boolean); // 去重并移除空字符串
          break;
        case 'imagePrompt':
          imagePrompt = sectionContent;
          break;
        case 'selfComment':
          selfComment = sectionContent;
          break;
        case 'strategy':
          strategy = sectionContent;
          break;
        case 'playbook':
          playbook = sectionContent;
          break;
      }
    }

    return { titles, body, tags, imagePrompt, selfComment, strategy, playbook };
  }, []);

  // 实时解析显示内容并更新状态 - 使用节流优化性能
  useEffect(() => {
    if (!displayContent) return;

    // 使用 requestAnimationFrame 优化渲染性能
    const timeoutId = setTimeout(() => {
      const parsed = parseContent(displayContent);
      setGeneratedContent(parsed);
    }, 100); // 100ms 节流，避免过于频繁的解析

    return () => clearTimeout(timeoutId);
  }, [displayContent, parseContent]);

  const hasParsedContent = Boolean(
    generatedContent.titles.trim() ||
    generatedContent.body.trim() ||
    generatedContent.tags.length > 0 ||
    generatedContent.imagePrompt.trim() ||
    generatedContent.selfComment.trim() ||
    generatedContent.strategy.trim() ||
    generatedContent.playbook.trim()
  );

  const buildFullCopyText = useCallback(() => {
    const sections: string[] = [];

    if (generatedContent.titles.trim()) {
      sections.push(`【爆款标题】\n${generatedContent.titles.trim()}`);
    }
    if (generatedContent.body.trim()) {
      sections.push(`【正文内容】\n${generatedContent.body.trim()}`);
    }
    if (generatedContent.tags.length > 0) {
      sections.push(`【关键词标签】\n${generatedContent.tags.map(tag => `#${tag}`).join(' ')}`);
    }
    if (generatedContent.imagePrompt.trim()) {
      sections.push(`【绘画提示词】\n${generatedContent.imagePrompt.trim()}`);
    }
    if (generatedContent.selfComment.trim()) {
      sections.push(`【首评建议】\n${generatedContent.selfComment.trim()}`);
    }
    if (generatedContent.strategy.trim()) {
      sections.push(`【发布策略】\n${generatedContent.strategy.trim()}`);
    }
    if (generatedContent.playbook.trim()) {
      sections.push(`【增长 Playbook】\n${generatedContent.playbook.trim()}`);
    }

    const normalized = sections.join('\n\n');
    return normalized || displayContent.trim();
  }, [displayContent, generatedContent]);

  // 通用的、带反馈的复制处理函数
  const handleCopy = async (textToCopy: string | undefined, buttonId: string) => {
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (copyError) {
      console.error('复制失败:', copyError);
      return;
    }

    // 清除上一个计时器（如果存在）
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    setCopiedButtonId(buttonId);

    // 2秒后自动恢复按钮状态
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedButtonId(null);
    }, 2000);
  };

  // 滚动检测，显示回到顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 回到顶部函数
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 开始生成的函数
  const startGeneration = async () => {
    const keyword = searchParams.get('keyword');
    const userInfo = searchParams.get('userInfo');
    let currentGeneration = 0;

    if (!keyword || !userInfo) {
      setError('缺少必要的参数');
      setLoading(false);
      return;
    }

    try {
      // 标记开始生成
      currentGeneration = ++generationSequenceRef.current;
      const isCurrentGeneration = () =>
        generationSequenceRef.current === currentGeneration && !abortControllerRef.current?.signal.aborted;

      setHasGenerated(true);
      setLoading(true);
      setError(null);

      // 立即开始生成流程，不等待
      setLoadingStage('fetching-data');
      setDisplayContent('');
      setGeneratedContent({ ...EMPTY_GENERATED_CONTENT });

      // 确保之前的 AbortController 被清理
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();
      const currentController = abortControllerRef.current;

      try {
        setLoadingStage('analyzing-trends');

        const streamResponse = await fetch('/api/generate-combined', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_info: userInfo,
            keyword,
          }),
          signal: currentController.signal,
        });

        // 检查请求是否被中止
        if (currentController.signal.aborted) {
          console.log('请求被中止');
          return;
        }

        if (!streamResponse.ok) {
          throw new Error(`生成内容失败: HTTP ${streamResponse.status}`);
        }

        setLoadingStage('generating-content');

        const reader = streamResponse.body?.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';

        if (!reader) {
          throw new Error('服务端未返回可读取的流');
        }

        const handleStreamData = (rawData: string) => {
          if (!isCurrentGeneration()) return false;
          if (rawData === '[DONE]') {
            setLoading(false);
            setLoadingStage('');
            return true;
          }

          try {
            const parsed = JSON.parse(rawData);
            if (parsed.content) {
              setDisplayContent(prev => prev + parsed.content);
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (parseError) {
            console.warn('解析错误:', parseError);
          }
          return false;
        };

        try {
          while (true) {
            // 检查是否被中止
            if (currentController.signal.aborted) {
              console.log('读取被中止');
              break;
            }

            const { done, value } = await reader.read();
            if (done) break;

            streamBuffer += decoder.decode(value, { stream: true });
            const lines = streamBuffer.split('\n');
            streamBuffer = lines.pop() ?? '';

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (!data) continue;
              if (handleStreamData(data)) {
                return;
              }
            }
          }

          const tailLine = streamBuffer.trim();
          if (tailLine.startsWith('data:')) {
            const data = tailLine.slice(5).trim();
            if (data) {
              handleStreamData(data);
            }
          }
        } finally {
          reader.releaseLock();
          if (isCurrentGeneration()) {
            setLoading(false);
            setLoadingStage('');
          }
        }
      } catch (fetchError) {
        // 检查是否是中止错误
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.log('请求被主动中止');
          return;
        }
        throw fetchError;
      }
    } catch (err) {
      console.error('生成失败:', err);

      // 提供更详细的错误信息
      let errorMessage = '生成失败，请重试';
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else if (err.message.includes('timeout')) {
          errorMessage = '请求超时，请重试';
        } else {
          errorMessage = err.message;
        }
      }

      if (currentGeneration === generationSequenceRef.current) {
        setError(errorMessage);
        setLoading(false);
        setLoadingStage('');
      }
    }
  };

  // 从URL参数中获取数据并判断是否需要生成
  useEffect(() => {
    const checkAndStart = async () => {
      try {
        // 检查是否有已生成的数据（来自旧的跳转方式）
        const data = searchParams.get('data');
        if (data) {
          // 处理已生成的数据
          const decodedData = decodeURIComponent(atob(data));
          const parsed = parseContent(decodedData);
          setDisplayContent(decodedData);
          setGeneratedContent(parsed);
          setLoading(false);
          setHasGenerated(true);
          return;
        }

        // 获取新的参数（keyword和userInfo）
        const keyword = searchParams.get('keyword');
        const userInfo = searchParams.get('userInfo');

        if (!keyword || !userInfo) {
          setError('缺少必要的参数');
          setLoading(false);
          return;
        }

        // 检查是否是页面刷新的情况
        const sessionKey = `generated_${keyword}_${userInfo}`;
        const hasGeneratedInSession = sessionStorage.getItem(sessionKey);

        if (hasGeneratedInSession && !hasGenerated) {
          // 页面刷新的情况，显示重新生成提示
          setLoading(false);
          setShowRegeneratePrompt(true);
          return;
        }

        // 如果还没有生成过，开始生成
        if (!hasGenerated) {
          // 标记这个会话已经生成过
          sessionStorage.setItem(sessionKey, 'true');
          await startGeneration();
        }
      } catch (err) {
        console.error('初始化失败:', err);
        setError('初始化失败');
        setLoading(false);
      }
    };

    checkAndStart();
  }, [searchParams, parseContent, hasGenerated]);

  // 清理函数
  useEffect(() => {
    return () => {
      // 清理 AbortController
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // 失效当前生成序列，避免异步回调污染状态
      generationSequenceRef.current += 1;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);


  if (showRegeneratePrompt) {
    return (
      <div className="min-h-screen bg-transparent relative overflow-hidden">
        <BackgroundDecorations />

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Card className="glass-card animate-scale-in max-w-md mx-4 overflow-hidden rounded-[2rem]">
            <CardContent className="text-center py-12 px-6 relative overflow-hidden">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full shadow-lg shadow-orange-500/20">
                <RefreshCw className="w-8 h-8 text-white" />
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  检测到页面刷新
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  页面已刷新，之前可能已经生成过内容。你是否要重新生成新的内容？
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={async () => {
                    setShowRegeneratePrompt(false);
                    await startGeneration();
                  }}
                  className="w-full px-6 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <span className="flex items-center justify-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5" />
                    重新生成内容
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* 底部悬浮操作区（针对移动端优化） */}
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 z-50 animate-slide-up shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row gap-3">
          <div className="max-w-5xl mx-auto w-full flex gap-3 pb-safe">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="flex-1 sm:hidden h-12 rounded-xl font-bold bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
              size="lg"
            >
              返回修改
            </Button>

            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="hidden sm:flex flex-1 max-w-[200px] h-14 rounded-xl font-bold bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 shadow-sm transition-all duration-300"
              size="lg"
            >
              <span className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 opacity-70" /> 修改提示词
              </span>
            </Button>

            <Button
              onClick={async () => {
                setShowRegeneratePrompt(false);
                await startGeneration();
              }}
              disabled={loading}
              className="flex-[2] sm:flex-[3] h-12 sm:h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-base sm:text-lg shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:shadow-[0_8px_30px_rgb(79,70,229,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 border border-white/10"
              size="lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2 sm:gap-3">
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                  智能生成中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 sm:gap-3">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  再生成一篇
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !hasParsedContent) {
    const loadingStages = {
      'preparing': {
        icon: <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 dark:text-blue-400" />,
        title: '准备启动...',
        description: '引擎全面预热，即将进入智能涌现状态'
      },
      'fetching-data': {
        icon: <Search className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500 dark:text-indigo-400" />,
        title: '网络嗅探中...',
        description: '深潜全网数据层，捕捉最新高传播动能节点'
      },
      'analyzing-trends': {
        icon: <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500 dark:text-purple-400" />,
        title: '解构爆款基因...',
        description: '高频分析万级样本，提取底层吸引力公式'
      },
      'generating-content': {
        icon: <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-300" />,
        title: '重塑内容形态...',
        description: '套用高转化微结构，浇筑文字的黄金比例'
      }
    };

    const currentStage = loadingStages[loadingStage as keyof typeof loadingStages] || loadingStages.preparing;
    return (
      <div className="min-h-screen bg-transparent relative overflow-hidden">
        <BackgroundDecorations />

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Card className="glass-card animate-scale-in max-w-lg mx-4 rounded-[2rem] overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-shimmer"></div>
            <CardContent className="text-center py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-10 relative overflow-hidden">
              {/* 动态背景 */}
              <div className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none">
                <div className="absolute top-4 left-4 w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-ping"></div>
                <div className="absolute top-8 right-8 w-3 h-3 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-6 left-1/3 w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-12 right-1/4 w-1 h-1 bg-slate-400 dark:bg-slate-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mb-6 sm:mb-8 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-lg shadow-blue-500/20 animate-spin-slow">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border-2 border-transparent">
                    <span className="animate-bounce-gentle">{currentStage.icon}</span>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent animate-pulse">
                    {currentStage.title}
                  </h3>
                  <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
                    {currentStage.description}
                  </p>

                  {/* 进度指示器 */}
                  <div className="flex justify-center items-center gap-2 sm:gap-3 mt-8">
                    {Object.keys(loadingStages).map((stage, index) => (
                      <div
                        key={stage}
                        className={`w-3 h-3 rounded-full transition-all duration-500 ${Object.keys(loadingStages).indexOf(loadingStage) >= index
                          ? 'bg-blue-500 dark:bg-blue-400 shadow-lg shadow-blue-500/50 scale-110'
                          : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent relative flex items-center justify-center overflow-hidden">
        <BackgroundDecorations />
        <Card className="glass-card animate-scale-in max-w-md mx-4 rounded-[2rem] border-red-200/50 dark:border-red-900/50">
          <CardContent className="text-center py-12 px-6">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-red-50 dark:bg-red-900/20 rounded-full border border-red-100 dark:border-red-800/50">
              <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-3">系统错误</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">{error}</p>
            <Button
              onClick={() => router.push('/')}
              className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              返回控制台
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden pb-12">
      <BackgroundDecorations />

      <div className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">

          {/* 返回按钮和快速导航 */}
          <div className="flex justify-between items-center mb-6">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="flex items-center gap-2 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300"
            >
              <ArrowLeft size={16} />
              返回首页
            </Button>

            {/* 快速导航 - 桌面端和移动端不同样式 */}
            {!loading && (
              <>
                {/* 桌面端导航 */}
                <div className="hidden lg:flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-blue-200/50 shadow-lg">
                  <span className="text-sm text-gray-600 font-medium">快速跳转：</span>
                  <div className="flex gap-2">
                    {generatedContent.titles && (
                      <button
                        onClick={() => document.getElementById('titles-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        标题
                      </button>
                    )}
                    {generatedContent.body && (
                      <button
                        onClick={() => document.getElementById('body-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                      >
                        正文
                      </button>
                    )}
                    {generatedContent.tags.length > 0 && (
                      <button
                        onClick={() => document.getElementById('tags-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        标签
                      </button>
                    )}
                  </div>
                </div>

                {/* 移动端导航 - 简化版本 */}
                <div className="lg:hidden flex items-center gap-1">
                  {generatedContent.titles && (
                    <button
                      onClick={() => document.getElementById('titles-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      标题
                    </button>
                  )}
                  {generatedContent.body && (
                    <button
                      onClick={() => document.getElementById('body-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      正文
                    </button>
                  )}
                  {generatedContent.tags.length > 0 && (
                    <button
                      onClick={() => document.getElementById('tags-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      标签
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 加载状态卡片 - 流式生成过程中持续显示 */}
          {loading && (
            <Card className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/90 backdrop-blur-md border border-blue-200/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-shimmer"></div>
              <CardContent className="text-center py-12 sm:py-16 px-4 sm:px-6 relative overflow-hidden">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-2xl animate-spin-slow">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center">
                    <span className="text-xl sm:text-2xl animate-bounce">✨</span>
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                    AI 正在流式创作中...
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed">
                    新内容会持续写入下方卡片，等待完成即可一键复制。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 生成完成总览卡片 - 仅在生成完成后显示 */}
          {!loading && generatedContent.titles && (
            <Card className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-blue-50/90 backdrop-blur-md border border-green-200/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                    <span className="text-xl sm:text-2xl lg:text-3xl animate-bounce-gentle">🎉</span>
                    <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-blue-600 bg-clip-text text-transparent font-bold">
                      生成完成
                    </span>
                    <Badge variant="tag" className="ml-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 animate-scale-in">
                      已完成
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1">
                    AI 已完成内容创作，点击各部分可单独复制或复制全文
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleCopy(buildFullCopyText(), 'full')}
                  variant="glass"
                  size="sm"
                  className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {copiedButtonId === 'full' ? (
                    <span className="flex items-center gap-2 text-green-600">
                      <Check size={16} className="animate-scale-in" />
                      已复制
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Clipboard size={16} />
                      复制全文
                    </span>
                  )}
                </Button>
              </CardHeader>
            </Card>
          )}

          {/* 概览与数据 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Card className="glass-card shadow-lg hover-lift bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-slate-900/40 backdrop-blur-md border border-blue-200/30 dark:border-blue-700/30">
              <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-blue-500/30 rotate-3 transition-transform hover:rotate-6">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">总字数预估</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">~800字</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card shadow-lg hover-lift bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-slate-50/90 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-slate-900/40 backdrop-blur-md border border-indigo-200/30 dark:border-indigo-700/30">
              <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-indigo-500/30 -rotate-3 transition-transform hover:-rotate-6">
                  <Tags className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">包含标签数</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">{generatedContent.tags.length || 0}个</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card shadow-lg hover-lift bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-slate-50/90 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-slate-900/40 backdrop-blur-md border border-purple-200/30 dark:border-purple-700/30">
              <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-purple-500/30 rotate-3 transition-transform hover:rotate-6">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">创意指数</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-700 to-pink-700 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">98%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card shadow-lg hover-lift bg-gradient-to-br from-pink-50/90 via-rose-50/80 to-slate-50/90 dark:from-pink-900/20 dark:via-rose-900/20 dark:to-slate-900/40 backdrop-blur-md border border-pink-200/30 dark:border-pink-700/30">
              <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-rose-400 to-orange-500 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-rose-500/30 -rotate-3 transition-transform hover:-rotate-6">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">爆款潜力</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 dark:from-rose-400 dark:to-orange-400 bg-clip-text text-transparent">极高</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 各个分段的卡片 - 根据内容实时显示 */}
          {/* 标题卡片 - 当有标题内容时就显示 */}
          {generatedContent.titles && (
            <>
              <div className="flex items-center justify-center my-6 sm:my-8 opacity-80">
                <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent to-blue-400 dark:to-blue-600"></div>
                <div className="px-3 sm:px-4 text-xs sm:text-sm text-blue-600/60 dark:text-blue-400/60 font-medium uppercase tracking-widest">Contents</div>
                <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent to-blue-400 dark:to-blue-600"></div>
              </div>

              <Card id="titles-section" className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-indigo-50/90 via-blue-50/80 to-slate-50/90 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-slate-900/50 backdrop-blur-md border border-indigo-200/30 dark:border-indigo-700/30">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6 relative">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                      <PartyPopper className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 animate-pulse" />
                      <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent font-bold">
                        爆款标题
                      </span>
                      <Badge variant="tag" className="ml-2 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 text-indigo-700 dark:text-indigo-300 border-0 animate-scale-in">
                        {loading ? '生成中...' : '优选'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 mt-1">
                      吸睛标题是获取流量的第一步
                    </CardDescription>
                  </div>
                <Button
                    onClick={() => handleCopy(generatedContent.titles, 'titles')}
                    variant="glass"
                    size="sm"
                    className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300 z-10"
                  >
                    {copiedButtonId === 'titles' ? (
                      <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Check size={16} className="animate-scale-in" />
                        已复制
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Clipboard size={16} />
                        复制标题
                      </span>
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                  <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed p-4 sm:p-6 bg-gradient-to-br from-blue-100/60 via-indigo-100/50 to-purple-100/60 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-blue-200/40 dark:border-blue-700/30 shadow-inner backdrop-blur-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      p: ({ children }) => <div className="mb-2">{children}</div>,
                      div: ({ children }) => <div className="mb-2">{children}</div>
                    }}>
                      {generatedContent.titles}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* 内容卡片 - 当有正文内容时就显示 */}
          {generatedContent.body && (
            <Card id="body-section" className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900/50 backdrop-blur-md border border-blue-200/30 dark:border-blue-700/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6 relative">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                    <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 animate-bounce-gentle" />
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent font-bold">
                      生成内容
                    </span>
                    <Badge variant="tag" className="ml-2 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 text-blue-700 dark:text-blue-300 border-0 animate-scale-in">
                      {loading ? '生成中...' : '已完成'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 mt-1">
                    AI生成的精彩正文内容
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleCopy(generatedContent.body, 'body')}
                  variant="glass"
                  size="sm"
                  className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300 z-10"
                >
                  {copiedButtonId === 'body' ? (
                    <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check size={16} className="animate-scale-in" />
                      已复制
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Clipboard size={16} />
                      复制正文
                    </span>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed p-4 sm:p-6 bg-gradient-to-br from-blue-100/60 via-indigo-100/50 to-slate-100/60 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-slate-900/20 rounded-2xl border-2 border-blue-200/40 dark:border-blue-700/30 shadow-inner backdrop-blur-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({ children }) => <div className="mb-2">{children}</div>,
                    div: ({ children }) => <div className="mb-2">{children}</div>,
                    // 确保其他可能产生块级元素的标签也正确处理
                    h1: ({ children }) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
                    h2: ({ children }) => <h2 className="mb-2 text-lg font-bold">{children}</h2>,
                    h3: ({ children }) => <h3 className="mb-2 text-md font-bold">{children}</h3>,
                    ul: ({ children }) => <ul className="mb-2 list-disc list-inside">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 list-decimal list-inside">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>
                  }}>
                    {generatedContent.body}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 绘画提示词卡片 */}
          {generatedContent.imagePrompt && (
            <Card id="prompts-section" className="animate-slide-up glass-card shadow-xl hover-lift bg-gradient-to-br from-purple-50/80 via-pink-50/70 to-rose-50/80 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-rose-900/30 backdrop-blur-md border border-purple-200/30 dark:border-purple-700/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6 relative">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                    <ImagePlus className="w-5 h-5 sm:w-7 sm:h-7 text-purple-500 animate-bounce-gentle" />
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent font-bold">
                      Midjourney / DALL-E 绘画指令
                    </span>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 mt-1">
                    优质配图是小红书爆款的灵魂（可以直接复制到AI绘画工具中使用）
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleCopy(generatedContent.imagePrompt, 'prompts')}
                  variant="glass"
                  size="sm"
                  className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300 z-10"
                >
                  {copiedButtonId === 'prompts' ? (
                    <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check size={16} className="animate-scale-in" />
                      已复制全部
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Clipboard size={16} />
                      复制全部指令
                    </span>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <div className="space-y-3 sm:space-y-4">
                  {generatedContent.imagePrompt.split('\n\n').filter(Boolean).map((prompt: string, index: number) => (
                    <div key={index} className="group relative bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-purple-200/40 dark:border-purple-700/40 shadow-sm hover:shadow-md transition-all duration-300 p-3 sm:p-4 pl-10 sm:pl-12">
                      <div className="absolute left-3 sm:left-4 top-3.5 sm:top-4.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        {index + 1}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium pr-8 sm:pr-10">{prompt}</p>

                      <button
                        onClick={() => handleCopy(prompt, `prompt-${index}`)}
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-purple-400 dark:text-purple-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="复制此提示词"
                      >
                        {copiedButtonId === `prompt-${index}` ? <Check size={16} className="text-green-500" /> : <Clipboard size={16} />}
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 首评卡片 */}
          {generatedContent.selfComment && (
            <Card id="comment-section" className="animate-slide-up glass-card shadow-xl hover-lift bg-gradient-to-br from-rose-50/80 via-orange-50/70 to-amber-50/80 dark:from-rose-950/30 dark:via-orange-950/20 dark:to-amber-900/30 backdrop-blur-md border border-rose-200/30 dark:border-rose-700/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6 relative">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                    <MessageCircle className="w-5 h-5 sm:w-7 sm:h-7 text-rose-500 animate-bounce-gentle" />
                    <span className="bg-gradient-to-r from-rose-500 to-orange-500 dark:from-rose-400 dark:to-orange-400 bg-clip-text text-transparent font-bold">
                      引导互动首评
                    </span>
                  </CardTitle>
                </div>
                <Button
                  onClick={() => handleCopy(generatedContent.selfComment, 'comment')}
                  variant="glass"
                  size="sm"
                  className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300 z-10"
                >
                  {copiedButtonId === 'comment' ? (
                    <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check size={16} className="animate-scale-in" />
                      已复制
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Clipboard size={16} />
                      复制评论
                    </span>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 sm:p-5 border border-rose-200/50 dark:border-rose-800/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-400 to-orange-500"></div>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium pl-3">{generatedContent.selfComment}</p>
                </div>
                <div className="mt-3 sm:mt-4 p-3 bg-rose-100/40 dark:bg-rose-900/20 rounded-lg border border-rose-200/50 dark:border-rose-800/30 text-xs sm:text-sm text-rose-700 dark:text-rose-400 font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 shrink-0" /> 自己发布后第一时间在评论区发这条评论，并顶置，能提升至少30%的互动率。
                </div>
              </CardContent>
            </Card>
          )}

          {/* 关键词标签卡片 */}
          {generatedContent.tags && generatedContent.tags.length > 0 && (
            <Card id="tags-section" className="animate-slide-up glass-card shadow-xl hover-lift bg-gradient-to-br from-indigo-50/80 via-purple-50/70 to-pink-50/80 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-900/30 backdrop-blur-md border border-indigo-200/30 dark:border-indigo-700/30">
              <CardHeader className="pb-3 px-4 sm:px-6 lg:px-8 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                  <Tags className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-500 animate-pulse" />
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent font-bold">
                    高转化话题标签
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {generatedContent.tags.map((tag: string, index: number) => (
                    <Badge
                      key={index}
                      variant="tag"
                      className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 border border-indigo-200/50 dark:border-indigo-700/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-indigo-100/40 dark:bg-indigo-900/20 rounded-xl border border-indigo-200/30 dark:border-indigo-800/30">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                      建议将前3-5个最相关的标签放在正文末尾，其他标签可以放在评论区首评，既能增加系统收录概率，又不会让正文显得杂乱。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 发布策略建议卡片 - 当有策略时就显示 */}
          {generatedContent.strategy && (
            <Card className="animate-slide-up glass-card shadow-xl hover-lift bg-gradient-to-br from-slate-50/90 via-blue-50/80 to-indigo-50/90 dark:from-slate-950/30 dark:via-blue-950/20 dark:to-indigo-900/30 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">
              <CardHeader className="pb-3 px-4 sm:px-6 lg:px-8 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                  <Calendar className="w-5 h-5 sm:w-7 sm:h-7 text-blue-500 animate-pulse" />
                  <span className="bg-gradient-to-r from-slate-700 to-blue-700 dark:from-slate-400 dark:to-blue-400 bg-clip-text text-transparent font-bold">发布策略建议</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                  <h4 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 mb-2 sm:mb-3 text-sm sm:text-base">
                    <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-1.5 rounded-lg">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    发布时机与执行建议
                  </h4>
                  <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      p: ({ children }) => <div className="mb-2">{children}</div>,
                      div: ({ children }) => <div className="mb-2">{children}</div>
                    }}>
                      {generatedContent.strategy}
                    </ReactMarkdown>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 小红书爆款增长 Playbook */}
          <div className="mt-8 sm:mt-12 mb-20 sm:mb-24 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 px-2">
              <Rocket className="w-6 h-6 sm:w-8 sm:h-8 text-slate-700 dark:text-slate-300" />
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">小红书爆款增长 Playbook</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <Card className="glass-card hover-lift border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900/50">
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 sm:mb-4">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 sm:mb-2 text-sm sm:text-base">流量黄金前1小时</h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">发布后第一时间转发到微信粉丝群，邀请好友点赞评论。系统初期会根据首波数据决定是否推入下一个流量池。</p>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900/50">
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 sm:mb-4">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 sm:mb-2 text-sm sm:text-base">神评论制造机</h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">用小号在评论区留下有争议性或有共鸣的评论，引导路人参与讨论。互动率&gt;5%是成为爆款的关键及格线。</p>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/40 dark:to-slate-900/50 sm:col-span-2 md:col-span-2 lg:col-span-1">
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl sm:rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 sm:mb-4">
                    <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 sm:mb-2 text-sm sm:text-base">长尾流量收割</h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">如果内容在48小时后还在涨粉，应立即在评论区置顶相关的引流/带货信息；或者发布"续集"留住持续关注的热度。</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 增长Playbook卡片 - 当有playbook时就显示 */}
          {generatedContent.playbook && (
            <Card className="animate-slide-up glass-card shadow-xl hover-lift bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-blue-50/90 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-blue-900/30 backdrop-blur-md border border-indigo-200/30 dark:border-indigo-700/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                    <TrendingUp className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-500 animate-pulse" />
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent font-bold">互动增长建议</span>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 mt-1">提升赞藏评数据的实操建议</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed p-4 sm:p-6 bg-gradient-to-br from-indigo-100/60 via-purple-100/50 to-blue-100/60 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-blue-900/20 rounded-2xl border-2 border-indigo-200/40 dark:border-indigo-700/30 shadow-inner backdrop-blur-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({ children }) => <div className="mb-2">{children}</div>,
                    div: ({ children }) => <div className="mb-2">{children}</div>
                  }}>
                    {generatedContent.playbook}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <Card className="glass-card shadow-2xl animate-fade-in bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"></div>
            <CardContent className="px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>{loading ? '内容仍在生成中，可提前复制已生成部分。' : '生成完成，可以复制使用了！'}</span>
                </div>
                <div className="flex gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end">
                  <Button
                    onClick={() => handleCopy(buildFullCopyText(), 'full')}
                    variant="modern"
                    size="sm"
                    className="shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {copiedButtonId === 'full' ? (
                      <span className="flex items-center gap-2 text-white">
                        <Check size={16} className="animate-scale-in" />
                        已复制全文
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Clipboard size={16} />
                        复制全文
                      </span>
                    )}
                  </Button>
                  <Button
                    onClick={() => router.push('/')}
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <span className="flex items-center gap-2">
                      <ArrowLeft size={16} />
                      返回首页
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 回到顶部按钮 */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center z-50 animate-fade-in hover:scale-110"
          >
            <ArrowUp size={20} />
          </button>
        )}
      </div>
    </div>
  )
}

// Loading component for Suspense fallback
function GeneratePageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在加载生成结果...</p>
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<GeneratePageLoading />}>
      <GeneratePageContent />
    </Suspense>
  )
}
